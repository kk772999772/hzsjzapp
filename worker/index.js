export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Set up standard CORS headers to allow cross-origin requests (e.g. from local development or Pages)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // 1. GET /api/records - Fetch all records (with optional month/year filter or date range)
      if (path === '/api/records' && request.method === 'GET') {
        const year = url.searchParams.get('year');
        const month = url.searchParams.get('month');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        
        let query = 'SELECT * FROM records';
        const params = [];
        
        if (startDate || endDate) {
          query += ' WHERE';
          if (startDate && endDate) {
            query += ' date BETWEEN ? AND ?';
            params.push(startDate, endDate);
          } else if (startDate) {
            query += ' date >= ?';
            params.push(startDate);
          } else {
            query += ' date <= ?';
            params.push(endDate);
          }
        } else if (year && month) {
          // Format month to 2 digits to match YYYY-MM-DD
          const paddedMonth = String(month).padStart(2, '0');
          query += ' WHERE date LIKE ?';
          params.push(`${year}-${paddedMonth}-%`);
        }
        
        query += ' ORDER BY date DESC, id DESC';
        
        const { results } = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      // 2. POST /api/records - Batch insert records for one or multiple names
      if (path === '/api/records' && request.method === 'POST') {
        const body = await request.json();
        const { date, village, names, project, price, weight, amount, note, period, work_hours, daily_wage, standard_hours } = body;
        
        if (!date || !village || !names || !Array.isArray(names) || names.length === 0 || !project || amount === undefined) {
          return new Response(JSON.stringify({ error: '缺少必要字段' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        // Prepare database batch insertions
        const stmt = env.DB.prepare(
          `INSERT INTO records (date, village, name, project, price, weight, amount, note, period, work_hours, daily_wage, standard_hours)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        const batch = names.map(name => 
          stmt.bind(
            date, 
            village, 
            name, 
            project, 
            price !== null && price !== undefined && price !== '' ? parseFloat(price) : null, 
            weight !== null && weight !== undefined && weight !== '' ? parseFloat(weight) : null, 
            parseFloat(amount), 
            note || null,
            period || null,
            work_hours !== null && work_hours !== undefined && work_hours !== '' ? parseFloat(work_hours) : null,
            daily_wage !== null && daily_wage !== undefined && daily_wage !== '' ? parseFloat(daily_wage) : null,
            standard_hours !== null && standard_hours !== undefined && standard_hours !== '' ? parseFloat(standard_hours) : null
          )
        );
        
        await env.DB.batch(batch);
        
        return new Response(JSON.stringify({ success: true, count: names.length }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      // 3. DELETE /api/records/:id - Delete a single record by ID
      if (path.startsWith('/api/records/') && request.method === 'DELETE') {
        const id = path.split('/').pop();
        if (!id) {
          return new Response(JSON.stringify({ error: 'Invalid ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(parseInt(id)).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      // 4. GET /api/stats - Fetch stats for charts and summaries
      if (path === '/api/stats' && request.method === 'GET') {
        const year = url.searchParams.get('year');
        const month = url.searchParams.get('month');
        
        let filter = '';
        const params = [];
        
        if (year && month) {
          const paddedMonth = String(month).padStart(2, '0');
          filter = ' WHERE date LIKE ?';
          params.push(`${year}-${paddedMonth}-%`);
        }
        
        // Aggregated totals by Village
        const villageStats = await env.DB.prepare(
          `SELECT village, SUM(amount) as total_amount, SUM(weight) as total_weight, COUNT(*) as count
           FROM records ${filter} GROUP BY village`
        ).bind(...params).all();
        
        // Aggregated totals by Project
        const projectStats = await env.DB.prepare(
          `SELECT project, SUM(amount) as total_amount, SUM(weight) as total_weight 
           FROM records ${filter} GROUP BY project`
        ).bind(...params).all();
        
        // Monthly trend (last 6 months)
        const trendStats = await env.DB.prepare(
          `SELECT strftime("%Y-%m", date) as month, SUM(amount) as total_amount 
           FROM records GROUP BY month ORDER BY month DESC LIMIT 6`
        ).all();
        
        return new Response(JSON.stringify({
          village: villageStats.results,
          project: projectStats.results,
          trend: trendStats.results.reverse() // Return in chronological order
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 5. GET /api/settings - Fetch settings
      if (path === '/api/settings' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM settings').all();
        const settingsObj = {};
        results.forEach(row => {
          settingsObj[row.key] = row.value;
        });
        return new Response(JSON.stringify(settingsObj), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 6. POST /api/settings - Update settings
      if (path === '/api/settings' && request.method === 'POST') {
        const body = await request.json();
        const batch = Object.entries(body).map(([key, val]) => 
          env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
            .bind(key, String(val))
        );
        
        await env.DB.batch(batch);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 7. GET /api/config - Fetch JSON configuration
      if (path === '/api/config' && request.method === 'GET') {
        const result = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('config_json').first();
        if (result && result.value) {
          return new Response(result.value, {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        return new Response(JSON.stringify({}), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 8. POST /api/config - Save JSON configuration
      if (path === '/api/config' && request.method === 'POST') {
        const body = await request.json();
        await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .bind('config_json', JSON.stringify(body))
          .run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

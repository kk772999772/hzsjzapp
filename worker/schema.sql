-- D1 Database Schema for Bookkeeping App

CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,          -- YYYY-MM-DD
    village TEXT NOT NULL,       -- Village name (e.g. 分类一)
    name TEXT NOT NULL,          -- Person name (e.g. 张三)
    project TEXT NOT NULL,       -- Project type (e.g. 草莓, 黄烟)
    price REAL,                  -- Unit price, optional (unused)
    weight REAL,                 -- Weight/Qty, optional (unused)
    amount REAL NOT NULL,        -- Total amount
    note TEXT,                   -- Note, optional
    period TEXT,                 -- Period: 上午, 下午, 全天
    work_hours REAL,             -- Actual work hours (工时)
    daily_wage REAL,             -- Daily wage rate (日工资)
    standard_hours REAL,         -- Standard daily work hours (日工作时间)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

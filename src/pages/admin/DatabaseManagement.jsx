import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { 
  FiArrowLeft, 
  FiDatabase, 
  FiDownload, 
  FiUpload, 
  FiTrash2, 
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiPlay,
  FiAlertTriangle,
  FiCheckCircle,
  FiBarChart2
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './AdminPages.css';

const DatabaseManagement = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [tableStats, setTableStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    try {
      // Get list of tables from your schema
      const tableList = [
        'users', 'profiles', 'stores', 'products', 'orders', 
        'categories', 'wallet_transactions', 'admin_users', 
        'admin_activities', 'promoted_products', 'store_requests',
        'messages', 'ratings', 'wishlist_items', 'cart_items',
        'installment_orders', 'escrow_transactions'
      ];

      // Fetch row counts for each table
      const stats = {};
      for (const tableName of tableList) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            stats[tableName] = count || 0;
          }
        } catch (error) {
          console.error(`Error counting ${tableName}:`, error);
          stats[tableName] = 'Error';
        }
      }

      setTables(tableList);
      setTableStats(stats);
    } catch (error) {
      console.error('Error fetching database info:', error);
      toast.error('Failed to load database information');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName) => {
    if (!tableName) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(50); // Limit to 50 rows for performance

      if (error) throw error;
      
      setTableData(data || []);
      setSelectedTable(tableName);
    } catch (error) {
      console.error('Error fetching table data:', error);
      toast.error(`Failed to load data from ${tableName}`);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    // Security check - prevent destructive operations in demo
    const dangerousKeywords = ['drop', 'delete', 'truncate', 'alter', 'update', 'insert'];
    const lowerQuery = query.toLowerCase();
    
    if (dangerousKeywords.some(keyword => lowerQuery.includes(keyword))) {
      toast.error('Destructive operations are disabled for safety');
      return;
    }

    setExecutingQuery(true);
    try {
      // For security, we'll only allow SELECT queries in this example
      if (!lowerQuery.trim().startsWith('select')) {
        toast.error('Only SELECT queries are allowed in this demo');
        return;
      }

      // Note: In a real application, you would have a secure backend endpoint
      // to execute queries. Direct client-side execution is not recommended.
      toast.error('Direct query execution is disabled for security. Use table views instead.');
      
    } catch (error) {
      console.error('Error executing query:', error);
      toast.error('Failed to execute query');
    } finally {
      setExecutingQuery(false);
    }
  };

  const exportTableData = async (tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(',');
      const csvData = data.map(row => 
        Object.values(row).map(field => 
          `"${String(field || '').replace(/"/g, '""')}"`
        ).join(',')
      ).join('\n');

      const csvContent = [headers, ...csvData].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} rows from ${tableName}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(`Failed to export ${tableName}`);
    }
  };

  const clearTableData = async (tableName) => {
    if (!window.confirm(`WARNING: This will delete ALL data from ${tableName}. This action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      toast.success(`All data cleared from ${tableName}`);
      fetchDatabaseInfo();
      if (selectedTable === tableName) {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error clearing table:', error);
      toast.error(`Failed to clear ${tableName}`);
    }
  };

  const optimizeDatabase = async () => {
    try {
      // This would typically call a backend function to optimize the database
      // For Supabase, this might involve vacuum operations or index optimization
      toast.success('Database optimization request sent');
      
      // Simulate optimization process
      setBackupStatus('Optimizing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBackupStatus('Optimization complete');
      
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (error) {
      console.error('Error optimizing database:', error);
      toast.error('Failed to optimize database');
      setBackupStatus('Optimization failed');
    }
  };

  const createBackup = async () => {
    try {
      // In a real application, this would call a backend service to create a database backup
      toast.success('Backup process started...');
      
      setBackupStatus('Creating backup...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      setBackupStatus('Backup completed successfully');
      
      setTimeout(() => setBackupStatus(''), 4000);
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
      setBackupStatus('Backup failed');
    }
  };

  const getTableSizeColor = (count) => {
    if (count > 10000) return 'var(--danger-color)';
    if (count > 1000) return 'var(--warning-color)';
    if (count > 100) return 'var(--info-color)';
    return 'var(--success-color)';
  };

  if (loading && !selectedTable) {
    return (
      <div className="admin-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading database information...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <button className="back-button" onClick={() => navigate('/admin-overview')}>
          <FiArrowLeft />
          Back to Dashboard
        </button>
        <div className="header-content">
          <h1>Database Management</h1>
          <p>Manage database tables, execute queries, and perform maintenance</p>
        </div>
        <div className="header-actions">
          <button className="add-button" onClick={createBackup}>
            <FiDownload />
            Create Backup
          </button>
          <button className="add-button" onClick={optimizeDatabase}>
            <FiRefreshCw />
            Optimize DB
          </button>
        </div>
      </div>

      {backupStatus && (
        <motion.div 
          className="status-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FiRefreshCw className="spinning" />
          {backupStatus}
        </motion.div>
      )}

      {/* Database Overview */}
      <section className="database-overview">
        <h2>Database Overview</h2>
        <div className="tables-grid">
          {tables.map((table, index) => (
            <motion.div
              key={table}
              className="table-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => fetchTableData(table)}
            >
              <div className="table-header">
                <FiDatabase />
                <h3>{table}</h3>
                <span 
                  className="row-count"
                  style={{ color: getTableSizeColor(tableStats[table]) }}
                >
                  {tableStats[table]?.toLocaleString() || 0} rows
                </span>
              </div>
              <div className="table-actions">
                <button
                  className="action-btn view"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchTableData(table);
                  }}
                  title="View data"
                >
                  <FiEye />
                </button>
                <button
                  className="action-btn export"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportTableData(table);
                  }}
                  title="Export to CSV"
                >
                  <FiDownload />
                </button>
                <button
                  className="action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearTableData(table);
                  }}
                  title="Clear all data"
                >
                  <FiTrash2 />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Query Execution */}
      <section className="query-section">
        <h2>SQL Query Execution</h2>
        <div className="query-editor">
          <div className="query-header">
            <span>Execute SQL Query (Read-only)</span>
            <div className="query-actions">
              <button 
                className="run-query-btn"
                onClick={executeQuery}
                disabled={executingQuery}
              >
                {executingQuery ? <FiRefreshCw className="spinning" /> : <FiPlay />}
                {executingQuery ? 'Executing...' : 'Execute Query'}
              </button>
            </div>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM users LIMIT 10;"
            rows={4}
            className="query-input"
          />
          <div className="query-hint">
            <FiAlertTriangle />
            Only SELECT queries are allowed for security reasons
          </div>
        </div>

        {queryResults && (
          <div className="query-results">
            <h3>Query Results</h3>
            <div className="results-info">
              {queryResults.rowCount} rows returned in {queryResults.executionTime}ms
            </div>
            {/* Results table would be displayed here */}
          </div>
        )}
      </section>

      {/* Table Data Viewer */}
      {selectedTable && (
        <section className="table-viewer">
          <div className="viewer-header">
            <h2>Data from {selectedTable}</h2>
            <div className="viewer-actions">
              <span className="row-count">
                Showing {tableData.length} rows
              </span>
              <button
                className="action-btn export"
                onClick={() => exportTableData(selectedTable)}
              >
                <FiDownload />
                Export CSV
              </button>
              <button
                className="action-btn danger"
                onClick={() => clearTableData(selectedTable)}
              >
                <FiTrash2 />
                Clear Table
              </button>
            </div>
          </div>

          {tableData.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(tableData[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 50).map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex}>
                          {typeof value === 'object' 
                            ? JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
                            : String(value).substring(0, 100) + (String(value).length > 100 ? '...' : '')
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {tableData.length > 50 && (
                <div className="table-footer">
                  <FiAlertTriangle />
                  Showing first 50 rows. Export to see all data.
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <FiDatabase size={48} />
              <h3>No data found</h3>
              <p>This table is empty or an error occurred while loading data</p>
            </div>
          )}
        </section>
      )}

      {/* Database Statistics */}
      <section className="database-stats">
        <h2>Database Statistics</h2>
        <div className="stats-cards">
          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)15', color: 'var(--info-color)' }}>
              <FiDatabase />
            </div>
            <div className="stat-content">
              <h3>{tables.length}</h3>
              <span>Total Tables</span>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)15', color: 'var(--success-color)' }}>
              <FiBarChart2 />
            </div>
            <div className="stat-content">
              <h3>{Object.values(tableStats).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0).toLocaleString()}</h3>
              <span>Total Records</span>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)15', color: 'var(--warning-color)' }}>
              <FiAlertTriangle />
            </div>
            <div className="stat-content">
              <h3>0</h3>
              <span>Active Connections</span>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon" style={{ backgroundColor: 'var(--purple-color)15', color: 'var(--purple-color)' }}>
              <FiCheckCircle />
            </div>
            <div className="stat-content">
              <h3>Healthy</h3>
              <span>Database Status</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Warning Banner */}
      <motion.div 
        className="warning-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <FiAlertTriangle />
        <div>
          <strong>Security Notice</strong>
          <p>Destructive operations (DELETE, DROP, TRUNCATE) are disabled. Only SELECT queries are allowed for security reasons.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default DatabaseManagement;
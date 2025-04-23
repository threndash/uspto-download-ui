import React, { useState, useEffect } from 'react';

const USPTODatasetsInterface = () => {
  // State variables
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [expandedAccordions, setExpandedAccordions] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [processedData, setProcessedData] = useState({});
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Try to read the file using window.fs
        const response = await window.fs.readFile('uspto_links.json', { encoding: 'utf8' });
        const jsonData = JSON.parse(response);
        
        // Process the data
        const processedData = processData(jsonData);
        setData(jsonData);
        setProcessedData(processedData);
        
        // Set available years
        const years = extractYears(jsonData);
        setAvailableYears(years);
        
        // Extract datasets from file paths
        const datasetList = extractDatasets(jsonData);
        setDatasets(datasetList);
        
        // Set the first dataset as active tab by default
        if (datasetList.length > 0) {
          setActiveTab(datasetList[0].id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Extract dataset categories from paths
  const extractDatasets = (data) => {
    const datasetMap = {
      'patent-assignment-dataset': {
        id: 'patent-assignment-dataset',
        name: 'Patent Assignment Dataset',
        path: 'patent-assignment-dataset'
      },
      'patent-claims-research-dataset': {
        id: 'patent-claims-research-dataset',
        name: 'Patent Claims Research Dataset',
        path: 'patent-claims-research-dataset'
      },
      'patent-examination-research-dataset-public-pair': {
        id: 'patent-examination-research-dataset-public-pair',
        name: 'Patent Examination Research Dataset (Public PAIR)',
        path: 'patent-examination-research-dataset-public-pair'
      }
    };
    
    const datasets = new Set();
    
    data.forEach(item => {
      if (item.path) {
        const pathParts = item.path.split('/');
        if (pathParts.length > 0) {
          datasets.add(pathParts[0]);
        }
      }
    });
    
    // Convert to array and map to friendly names
    return Array.from(datasets).map(dataset => datasetMap[dataset]);
  };

  // Extract years from the data
  const extractYears = (data) => {
    const years = new Set();
    
    data.forEach(item => {
      const tableName = item.table_name;
      const yearMatch = tableName.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        years.add(yearMatch[1]);
      }
    });
    
    return Array.from(years).sort((a, b) => b - a); // Sort years in descending order
  };
  
  // Process raw data into structured format
  const processData = (data) => {
    const result = {};
    
    // First, identify all datasets
    const datasets = new Set();
    data.forEach(item => {
      if (item.path) {
        const pathParts = item.path.split('/');
        if (pathParts.length > 0) {
          datasets.add(pathParts[0]);
        }
      }
    });
    
    // For each dataset, group files by table name
    datasets.forEach(dataset => {
      result[dataset] = {};
      
      // Extract table bases for this dataset
      const tableBaseSet = new Set();
      data.forEach(item => {
        if (item.path && item.path.startsWith(dataset)) {
          let baseName = item.table_name;
          // Extract year and format, then remove them from base name
          baseName = baseName.replace(/\b(20\d{2})\b/, '').replace(/(DTA|CSV)$/, '').trim();
          baseName = baseName.replace(/[_\s]+$/, '');
          tableBaseSet.add(baseName);
        }
      });
      
      const tableBases = Array.from(tableBaseSet).sort();
      
      // Group files by table base
      tableBases.forEach(baseTable => {
        result[dataset][baseTable] = {
          items: []
        };
        
        // Find all files for this table base
        data.forEach(item => {
          if (item.path && item.path.startsWith(dataset)) {
            let itemBaseName = item.table_name;
            // Extract year
            const yearMatch = itemBaseName.match(/\b(20\d{2})\b/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Extract format (DTA/CSV)
            const formatMatch = itemBaseName.match(/(DTA|CSV)$/);
            const format = formatMatch ? formatMatch[1] : null;
            
            // Remove year and format to get base name
            itemBaseName = itemBaseName.replace(/\b(20\d{2})\b/, '').replace(/(DTA|CSV)$/, '').trim();
            itemBaseName = itemBaseName.replace(/[_\s]+$/, '');
            
            if (itemBaseName === baseTable) {
              result[dataset][baseTable].items.push({
                ...item,
                year,
                format
              });
            }
          }
        });
      });
    });
    
    return result;
  };
  
  // Toggle accordion expansion
  const toggleAccordion = (tableBase) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [tableBase]: !prev[tableBase]
    }));
  };
  
  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reset accordions when changing tabs
    setExpandedAccordions({});
  };
  
  // Format display name from table name
  const formatDisplayName = (name) => {
    if (!name) return '';
    
    // Split by underscores and spaces
    return name
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Group items by year and format
  const groupItemsByYearAndFormat = (items) => {
    const result = {};
    
    items.forEach(item => {
      if (!result[item.year]) {
        result[item.year] = {
          DTA: null,
          CSV: null
        };
      }
      
      if (item.format === 'DTA') {
        result[item.year].DTA = item;
      } else if (item.format === 'CSV') {
        result[item.year].CSV = item;
      }
    });
    
    return result;
  };
  
  // Handle file download
  const handleDownload = (link) => {
    if (link) {
      window.open(link, '_blank');
    }
  };
  
  // Check if there are items for the selected year
  const hasItemsForYear = (items, year) => {
    if (year === 'all') return true;
    return items.some(item => item.year === year);
  };
  
  // Get the dataset name from id
  const getDatasetName = (datasetId) => {
    const dataset = datasets.find(d => d.id === datasetId);
    return dataset ? dataset.name : datasetId;
  };
  
  // Modern styling
  const styles = {
    container: {
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      minHeight: '90vh',
    },
    header: {
      marginBottom: '2rem',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem',
    },
    subtitle: {
      fontSize: '1rem',
      color: '#64748b',
      marginBottom: '1.5rem',
    },
    tabsContainer: {
      width: '100%',
      marginBottom: '1.5rem',
    },
    tabsList: {
      display: 'flex',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '1.5rem',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      paddingBottom: '1px',
    },
    tabButton: {
      padding: '0.75rem 1.5rem',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      fontWeight: '500',
      color: '#64748b',
      transition: 'all 0.2s ease',
      marginRight: '1rem',
    },
    activeTab: {
      borderBottom: '2px solid #2563eb',
      color: '#2563eb',
      fontWeight: '600',
    },
    filtersContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '1.5rem',
    },
    filterLabel: {
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#334155',
    },
    selectDropdown: {
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.9rem',
      fontWeight: '500',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      color: '#334155',
      cursor: 'pointer',
      minWidth: '150px',
    },
    accordionContainer: {
      marginBottom: '1rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    accordionHeader: {
      padding: '1rem 1.25rem',
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      userSelect: 'none',
      backgroundColor: 'white',
      borderBottom: '1px solid #f1f5f9',
    },
    accordionIcon: {
      transition: 'transform 0.2s ease',
    },
    accordionIconExpanded: {
      transform: 'rotate(180deg)',
    },
    accordionContent: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
    },
    fileTable: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeader: {
      backgroundColor: '#f1f5f9',
      padding: '0.5rem 1rem',
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#475569',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
    },
    tableRow: {
      borderBottom: '1px solid #e2e8f0',
    },
    tableCell: {
      padding: '0.5rem 1rem',
      fontSize: '0.9rem',
      color: '#334155',
      verticalAlign: 'middle',
    },
    downloadButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      fontSize: '0.85rem',
      fontWeight: '500',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
    },
    downloadButtonHover: {
      backgroundColor: '#1d4ed8',
    },
    disabledButton: {
      backgroundColor: '#94a3b8',
      cursor: 'not-allowed',
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '3rem',
      color: '#64748b',
    },
    emptyState: {
      textAlign: 'center',
      padding: '2rem',
      color: '#64748b',
    }
  };

  // Format the short dataset name
  const formatDatasetShortName = (path) => {
    if (path === 'patent-assignment-dataset') return 'Assignment';
    if (path === 'patent-claims-research-dataset') return 'Claims';
    if (path === 'patent-examination-research-dataset-public-pair') return 'Examination';
    return path;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div>Loading USPTO patent datasets...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>USPTO Patent Research Datasets</h1>
        <p style={styles.subtitle}>
          Access and download patent research datasets provided by the United States Patent and Trademark Office
        </p>
      </div>

      <div style={styles.tabsContainer}>
        <div style={styles.tabsList}>
          {datasets.map(dataset => (
            <div 
              key={dataset.id}
              style={{
                ...styles.tabButton,
                ...(activeTab === dataset.id ? styles.activeTab : {})
              }}
              onClick={() => handleTabChange(dataset.id)}
            >
              {formatDatasetShortName(dataset.path)}
            </div>
          ))}
        </div>
      </div>

      {activeTab && (
        <div style={styles.filtersContainer}>
          <div style={styles.filterLabel}>Filter by Year:</div>
          <select 
            style={styles.selectDropdown}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {activeTab && processedData[activeTab] && (
        <div>
          <h2 style={{...styles.subtitle, marginTop: '1rem', fontWeight: '600'}}>
            {getDatasetName(activeTab)}
          </h2>
          
          {Object.entries(processedData[activeTab]).map(([tableBase, { items }]) => {
            // Skip if no items for the selected year
            if (yearFilter !== 'all' && !hasItemsForYear(items, yearFilter)) {
              return null;
            }
            
            // Group by year and format
            const groupedItems = groupItemsByYearAndFormat(items);
            
            // Filter by year if not 'all'
            const years = yearFilter === 'all' 
              ? Object.keys(groupedItems).sort((a, b) => b - a) 
              : [yearFilter];
            
            return (
              <div key={tableBase} style={styles.accordionContainer}>
                <div 
                  style={styles.accordionHeader}
                  onClick={() => toggleAccordion(tableBase)}
                >
                  <div>{formatDisplayName(tableBase)}</div>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      ...styles.accordionIcon,
                      ...(expandedAccordions[tableBase] ? styles.accordionIconExpanded : {})
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                
                {expandedAccordions[tableBase] && (
                  <div style={styles.accordionContent}>
                    <table style={styles.fileTable}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>Year</th>
                          <th style={styles.tableHeader}>DTA Format</th>
                          <th style={styles.tableHeader}>CSV Format</th>
                        </tr>
                      </thead>
                      <tbody>
                        {years.map(year => (
                          <tr key={year} style={styles.tableRow}>
                            <td style={styles.tableCell}>{year}</td>
                            <td style={styles.tableCell}>
                              {groupedItems[year]?.DTA ? (
                                <button 
                                  style={styles.downloadButton}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = styles.downloadButtonHover.backgroundColor;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = styles.downloadButton.backgroundColor;
                                  }}
                                  onClick={() => handleDownload(groupedItems[year].DTA.shareable_link)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                  Download DTA
                                </button>
                              ) : (
                                <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>Not available</span>
                              )}
                            </td>
                            <td style={styles.tableCell}>
                              {groupedItems[year]?.CSV ? (
                                <button 
                                  style={styles.downloadButton}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = styles.downloadButtonHover.backgroundColor;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = styles.downloadButton.backgroundColor;
                                  }}
                                  onClick={() => handleDownload(groupedItems[year].CSV.shareable_link)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                  Download CSV
                                </button>
                              ) : (
                                <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>Not available</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default USPTODatasetsInterface;
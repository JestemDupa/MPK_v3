import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// File Tree Component
const FileTreeNode = ({ node, onFileSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node);
    }
  };

  const getIcon = () => {
    if (node.type === 'folder') {
      return isExpanded ? '📂' : '📁';
    }
    
    const ext = node.name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'docx':
      case 'doc': return '📝';
      case 'xlsx':
      case 'xls': return '📊';
      case 'txt': return '📃';
      default: return '📄';
    }
  };

  return (
    <div className="file-tree-node">
      <div 
        className={`file-tree-item ${node.type === 'file' ? 'file' : 'folder'}`}
        onClick={handleClick}
      >
        <span className="file-icon">{getIcon()}</span>
        <span className="file-name">{node.name}</span>
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child, index) => (
            <FileTreeNode 
              key={index} 
              node={child} 
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Search Result Component
const SearchResult = ({ result, onResultClick }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="search-result" onClick={() => onResultClick(result)}>
      <div className="result-header">
        <h3 className="result-title">{result.document.name}</h3>
        <span className="result-score">Score: {result.relevance_score.toFixed(2)}</span>
      </div>
      
      <div className="result-path">{result.document.relative_path}</div>
      
      <div className="result-snippet">{result.snippet}</div>
      
      <div className="result-meta">
        <span className="result-size">{formatFileSize(result.document.size)}</span>
        <span className="result-type">{result.document.file_type}</span>
        <span className="result-date">
          {new Date(result.document.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

// Document Preview Modal
const DocumentPreview = ({ document, onClose }) => {
  if (!document) return null;

  const renderThumbnail = () => {
    if (!document.thumbnail) return null;
    
    if (document.thumbnail.startsWith('data:text/plain')) {
      const content = atob(document.thumbnail.split(',')[1]);
      return (
        <div className="text-preview">
          <pre>{content}</pre>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{document.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="document-info">
            <p><strong>Path:</strong> {document.relative_path}</p>
            <p><strong>Type:</strong> {document.file_type}</p>
            <p><strong>Size:</strong> {(document.size / 1024).toFixed(2)} KB</p>
            <p><strong>Last Modified:</strong> {new Date(document.updated_at).toLocaleString()}</p>
          </div>
          
          <div className="document-preview">
            {renderThumbnail()}
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [fileTree, setFileTree] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadFileTree();
    loadStats();
    // Trigger initial scan
    axios.post(`${API}/scan`).catch(console.error);
  }, []);

  const loadFileTree = async () => {
    try {
      const response = await axios.get(`${API}/file-tree`);
      setFileTree(response.data);
    } catch (error) {
      console.error('Error loading file tree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.post(`${API}/search`, {
        query: searchQuery,
        limit: 50
      });
      
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSelect = (fileNode) => {
    // In a real implementation, you might want to load the file details
    console.log('File selected:', fileNode);
  };

  const handleResultClick = (result) => {
    setSelectedDocument(result.document);
  };

  const triggerRescan = async () => {
    try {
      await axios.post(`${API}/scan`);
      setTimeout(() => {
        loadFileTree();
        loadStats();
      }, 2000); // Wait a bit for scan to complete
    } catch (error) {
      console.error('Error triggering rescan:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading document index...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">📚 Document Search</h1>
          <div className="header-stats">
            {stats && (
              <>
                <span>{stats.total_documents} documents indexed</span>
                <button className="rescan-btn" onClick={triggerRescan}>
                  🔄 Rescan
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Left Sidebar - File Tree */}
        <div className="sidebar">
          <h3 className="sidebar-title">📁 File Browser</h3>
          <div className="file-tree">
            {fileTree ? (
              <FileTreeNode 
                node={fileTree} 
                onFileSelect={handleFileSelect}
              />
            ) : (
              <p>No files found</p>
            )}
          </div>
        </div>

        {/* Main Content - Search */}
        <div className="main-content">
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-button" disabled={isSearching}>
                  {isSearching ? '⏳' : '🔍'}
                </button>
              </div>
            </form>

            <div className="search-results">
              {isSearching ? (
                <div className="search-loading">
                  <div className="loading-spinner"></div>
                  <p>Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="results-container">
                  <h3 className="results-header">
                    Found {searchResults.length} results for "{searchQuery}"
                  </h3>
                  {searchResults.map((result, index) => (
                    <SearchResult
                      key={index}
                      result={result}
                      onResultClick={handleResultClick}
                    />
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="no-results">
                  <p>No documents found for "{searchQuery}"</p>
                  <p>Try different keywords or check if documents are indexed.</p>
                </div>
              ) : (
                <div className="welcome-message">
                  <h2>Welcome to Document Search</h2>
                  <p>Start typing to search through your indexed documents.</p>
                  <div className="search-tips">
                    <h4>Search Tips:</h4>
                    <ul>
                      <li>Use specific keywords from document content</li>
                      <li>Search works across PDF, DOCX, Excel, and text files</li>
                      <li>Results are ranked by relevance</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}

export default App;
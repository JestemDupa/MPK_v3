import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// File Tree Component
const FileTreeNode = ({ node, onFileSelect, selectedFilePath, expandedPaths, onToggleExpanded }) => {
  const isSelected = selectedFilePath === node.path;
  const isExpanded = expandedPaths.has(node.path);
  
  const handleClick = () => {
    if (node.type === 'folder') {
      onToggleExpanded(node.path);
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
        className={`file-tree-item ${node.type === 'file' ? 'file' : 'folder'} ${isSelected ? 'selected' : ''}`}
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
              selectedFilePath={selectedFilePath}
              expandedPaths={expandedPaths}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Search Result Component
const SearchResult = ({ result, onResultClick, onDownloadClick }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleResultClick = () => {
    onResultClick(result);
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation(); // Prevent triggering the result click
    onDownloadClick(result.document);
  };

  return (
    <div className="search-result" onClick={handleResultClick}>
      <div className="result-header">
        <h3 className="result-title">{result.document.name}</h3>
        <div className="result-actions">
          <span className="result-score">Score: {result.relevance_score.toFixed(2)}</span>
          <button className="download-btn" onClick={handleDownloadClick} title="Download">
            📥
          </button>
        </div>
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

// Document Preview Component (for main content area)
const DocumentPreviewMain = ({ document, onClose }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    if (!document.content) {
      return <p className="no-content">No content available for preview</p>;
    }

    // For text content, show formatted preview
    return (
      <div className="document-content">
        <pre>{document.content}</pre>
      </div>
    );
  };

  const handleDownload = () => {
    window.open(`${API}/documents/${document.id}/download`, '_blank');
  };

  return (
    <div className="document-preview-main">
      <div className="document-header">
        <div className="document-title-section">
          <h2 className="document-title">{document.name}</h2>
          <button className="close-preview-btn" onClick={onClose} title="Close Preview">
            ✕
          </button>
        </div>
        
        <div className="document-actions">
          <button className="action-btn download-btn" onClick={handleDownload}>
            📥 Download
          </button>
        </div>
      </div>

      <div className="document-details">
        <div className="detail-item">
          <strong>Path:</strong> {document.relative_path}
        </div>
        <div className="detail-item">
          <strong>Type:</strong> {document.file_type}
        </div>
        <div className="detail-item">
          <strong>Size:</strong> {formatFileSize(document.size)}
        </div>
        <div className="detail-item">
          <strong>Last Modified:</strong> {new Date(document.updated_at).toLocaleString()}
        </div>
      </div>

      <div className="document-content-section">
        <h3>Document Preview</h3>
        {renderContent()}
      </div>
    </div>
  );
};

// Document Preview Modal (for full-screen view)
const DocumentPreviewModal = ({ document, onClose }) => {
  if (!document) return null;

  const handleDownload = () => {
    window.open(`${API}/documents/${document.id}/download`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{document.name}</h2>
          <div className="modal-actions">
            <button className="action-btn download-btn" onClick={handleDownload}>
              📥 Download
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="document-info">
            <p><strong>Path:</strong> {document.relative_path}</p>
            <p><strong>Type:</strong> {document.file_type}</p>
            <p><strong>Size:</strong> {(document.size / 1024).toFixed(2)} KB</p>
            <p><strong>Last Modified:</strong> {new Date(document.updated_at).toLocaleString()}</p>
          </div>
          
          <div className="document-preview">
            {document.content && (
              <div className="text-preview">
                <pre>{document.content}</pre>
              </div>
            )}
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
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [previewDocument, setPreviewDocument] = useState(null);

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

  const loadDocumentByPath = async (relativePath) => {
    try {
      const response = await axios.get(`${API}/documents/path/${encodeURIComponent(relativePath)}`);
      return response.data;
    } catch (error) {
      console.error('Error loading document:', error);
      return null;
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

  const handleFileSelect = async (fileNode) => {
    // Highlight the selected file
    setSelectedFilePath(fileNode.path);
    
    // Load and preview the document
    const relativePath = fileNode.path.replace('/var/www/html/MPK/doc/', '');
    const document = await loadDocumentByPath(relativePath);
    if (document) {
      setPreviewDocument(document);
    }
  };

  const handleResultClick = async (result) => {
    // Highlight the file in the tree
    setSelectedFilePath(result.document.path);
    
    // Expand parent folders to show the file
    const pathParts = result.document.path.split('/');
    const newExpandedPaths = new Set(expandedPaths);
    
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += (currentPath ? '/' : '') + pathParts[i];
      newExpandedPaths.add(currentPath);
    }
    setExpandedPaths(newExpandedPaths);

    // Show document preview in main area
    setPreviewDocument(result.document);
  };

  const handleDownload = (document) => {
    window.open(`${API}/documents/${document.id}/download`, '_blank');
  };

  const handleToggleExpanded = (path) => {
    const newExpandedPaths = new Set(expandedPaths);
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path);
    } else {
      newExpandedPaths.add(path);
    }
    setExpandedPaths(newExpandedPaths);
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

  const renderMainContent = () => {
    if (previewDocument) {
      return (
        <DocumentPreviewMain
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      );
    }

    // Show search results or welcome message
    if (isSearching) {
      return (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      );
    } else if (searchResults.length > 0) {
      return (
        <div className="results-container">
          <h3 className="results-header">
            Found {searchResults.length} results for "{searchQuery}"
          </h3>
          {searchResults.map((result, index) => (
            <SearchResult
              key={index}
              result={result}
              onResultClick={handleResultClick}
              onDownloadClick={handleDownload}
            />
          ))}
        </div>
      );
    } else if (searchQuery) {
      return (
        <div className="no-results">
          <p>No documents found for "{searchQuery}"</p>
          <p>Try different keywords or check if documents are indexed.</p>
        </div>
      );
    } else {
      return (
        <div className="welcome-message">
          <h2>Welcome to Document Search</h2>
          <p>Start typing to search through your indexed documents, or click on a file in the browser to preview it.</p>
          <div className="search-tips">
            <h4>Usage Tips:</h4>
            <ul>
              <li>Use the search bar for full-text search across all documents</li>
              <li>Click on files in the left sidebar to preview them</li>
              <li>Click on search results to view and download documents</li>
              <li>Use the rescan button to refresh the file index</li>
            </ul>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">📚 Document Search</h1>
          
          <div className="header-right">
            <form onSubmit={handleSearch} className="header-search-form">
              <div className="header-search-container">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="header-search-input"
                />
                <button type="submit" className="header-search-button" disabled={isSearching}>
                  {isSearching ? '⏳' : '🔍'}
                </button>
              </div>
            </form>
            
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
                selectedFilePath={selectedFilePath}
                expandedPaths={expandedPaths}
                onToggleExpanded={handleToggleExpanded}
              />
            ) : (
              <p>No files found</p>
            )}
          </div>
        </div>

        {/* Main Content - Search or Preview */}
        <div className="main-content">
          <div className="search-results">
            {renderMainContent()}
          </div>
        </div>
      </div>

      {/* Document Preview Modal (if needed for full-screen view) */}
      {selectedDocument && (
        <DocumentPreviewModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}

export default App;
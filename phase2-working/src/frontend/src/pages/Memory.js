// Memory Archive Page Component - Redesigned to strictly follow Carbon design specs without blue or purple gradients
export const Memory = () => {
  const memories = [
    { id: 'mem_001', text: 'Project launch timeline planning', timestamp: '2026-08-02 00:15:32', tags: ['planning'] },
    { id: 'mem_002', text: 'API key configuration for OpenAI', timestamp: '2026-08-02 00:14:18', tags: ['setup'] },
    { id: 'mem_003', text: 'User feedback on voice output feature', timestamp: '2026-08-02 00:12:45', tags: ['feedback'] },
    { id: 'mem_004', text: 'Premium tier upgrade request', timestamp: '2026-08-02 00:10:22', tags: ['billing'] }
  ];

  // Set up global hooks for exports
  window.downloadJSONLD = () => {
    const userId = localStorage.getItem('userId') || 'demo';
    fetch('/api/memory/export/' + userId)
      .then(res => res.json())
      .then(data => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/ld+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thoughts-export-${userId}.jsonld`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Export failed, downloading local fallback memories:', err);
        const fallbackStr = JSON.stringify(memories, null, 2);
        const blob = new Blob([fallbackStr], { type: 'application/ld+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thoughts-export-${userId}.jsonld`;
        a.click();
      });
  };

  window.downloadMarkdown = () => {
    const userId = localStorage.getItem('userId') || 'demo';
    let mdContent = `# Thought GPS Memory Export\n\n`;
    mdContent += `User: ${userId}\nExported: ${new Date().toLocaleString()}\n\n`;
    memories.forEach(m => {
      mdContent += `### ${m.id} (${m.timestamp})\n${m.text}\n*Tags: ${m.tags.join(', ')}*\n\n---\n\n`;
    });
    
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughts-export-${userId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const container = document.createElement('div');
  container.className = 'card';
  container.innerHTML = `
    <h2>MEMORY ARCHIVE</h2>
    
    <!-- Memory Stats -->
    <div class="stats-grid">
      <div class="stat-box" style="border-left: 4px solid #198038;">
        <div style="font-family: 'Orbitron', sans-serif; color: #198038;">TOTAL MEMORIES</div>
        <div class="stat-value" style="color: #fff;">${memories.length}</div>
        <div class="stat-label">Stored Memories</div>
      </div>
      <div class="stat-box" style="border-left: 4px solid #f08c29;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">STORAGE USED</div>
        <div class="stat-value" style="color: #fff;">4.2 KB</div>
        <div class="stat-label">Current Usage</div>
      </div>
      <div class="stat-box" style="border-left: 4px solid #f08c29;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">AVG RETENTION</div>
        <div class="stat-value" style="color: #fff;">24H</div>
        <div class="stat-label">Average Time</div>
      </div>
    </div>
    
    <!-- Memory Table -->
    <h3 style="font-family: 'Orbitron', sans-serif; color: #fff; margin-bottom: 1rem;">
      MEMORY LOG
    </h3>
    <table class="keys-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Memory Text</th>
          <th>Timestamp</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        ${memories.map(memory => `
          <tr>
            <td>
              <span style="font-family: 'Courier New', monospace; color: #198038;">
                ${memory.id}
              </span>
            </td>
            <td style="color: #fff;">${memory.text}</td>
            <td>
              <span style="font-family: 'Courier New', monospace; color: #888;">
                ${memory.timestamp}
              </span>
            </td>
            <td>
              ${memory.tags.map(tag => `
                <span style="display: inline-block; background: rgba(25, 128, 56, 0.15); color: #198038; 
                            padding: 0.2rem 0.6rem; border-radius: 4px; margin-right: 0.5rem; 
                            font-family: 'Courier New', monospace; font-size: 0.8rem; border: 1px solid rgba(25, 128, 56, 0.3);">
                  ${tag}
                </span>
              `).join('')}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Memory Actions -->
    <div style="margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
      <button class="btn btn-success" onclick="downloadJSONLD()">
        Export JSON-LD
      </button>
      <button class="btn btn-primary" onclick="downloadMarkdown()">
        Download Markdown
      </button>
    </div>
    
    <div style="margin-top: 2rem; background: #111625; padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
      <div style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">
        MEMORY ARCHITECTURE
      </div>
      <div style="color: #ccc; line-height: 1.6; font-family: 'Courier New', monospace;">
        <p><strong style="color: #fff;">Layer 1:</strong> Redis (Fast access, 1-day retention)</p>
        <p><strong style="color: #fff;">Layer 2:</strong> PostgreSQL (Persistent storage)</p>
        <p><strong style="color: #fff;">Layer 3:</strong> Vector Database (Semantic search)</p>
        <p><strong style="color: #fff;">Layer 4:</strong> IPFS/Arweave (Permanent backup)</p>
      </div>
    </div>
  `;
  return container;
};

// Memory Component
export const Memory = () => {
  const memories = [
    { id: 'mem_001', text: 'Project launch timeline planning', timestamp: '2026-08-02 00:15:32', tags: ['planning'] },
    { id: 'mem_002', text: 'API key configuration for OpenAI', timestamp: '2026-08-02 00:14:18', tags: ['setup'] },
    { id: 'mem_003', text: 'User feedback on voice output feature', timestamp: '2026-08-02 00:12:45', tags: ['feedback'] },
    { id: 'mem_004', text: 'Premium tier upgrade request', timestamp: '2026-08-02 00:10:22', tags: ['billing'] }
  ];

  return `
    <div class="card">
      <h2>MEMORY ARCHIVE</h2>
      
      <!-- Memory Stats -->
      <div class="stats-grid">
        <div class="stat-box" style="border-color: #39ff14;">
          <div style="font-family: 'Orbitron', sans-serif; color: #39ff14;">TOTAL MEMORIES</div>
          <div class="stat-value" style="color: #39ff14;">${memories.length}</div>
          <div class="stat-label">Stored Memories</div>
        </div>
        <div class="stat-box" style="border-color: #ff3366;">
          <div style="font-family: 'Orbitron', sans-serif; color: #ff3366;">STORAGE USED</div>
          <div class="stat-value" style="color: #ff3366;">4.2 KB</div>
          <div class="stat-label">Current Usage</div>
        </div>
        <div class="stat-box" style="border-color: #00d2ff;">
          <div style="font-family: 'Orbitron', sans-serif; color: #00d2ff;">AVG RETENTION</div>
          <div class="stat-value" style="color: #00d2ff;">24H</div>
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
                <span style="font-family: 'Courier New', monospace; color: #39ff14;">
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
                  <span style="display: inline-block; background: #39ff1433; color: #39ff14; 
                              padding: 0.2rem 0.6rem; border-radius: 4px; margin-right: 0.5rem; 
                              font-family: 'Courier New', monospace; font-size: 0.8rem;">
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
        <button class="btn btn-success" onclick="alert('Exporting memory to blockchain...')">
          EXPORT TO BLOCKCHAIN
        </button>
        <button class="btn btn-primary" onclick="alert('Downloading memory archive...')">
          DOWNLOAD ARCHIVE
        </button>
      </div>
      
      <div style="margin-top: 2rem; background: rgba(0, 0, 0, 0.5); padding: 1.5rem; border-radius: 8px;">
        <div style="font-family: 'Orbitron', sans-serif; color: #00d2ff; margin-bottom: 1rem;">
          MEMORY ARCHITECTURE
        </div>
        <div style="color: #aaa; line-height: 1.6;">
          <p><strong style="color: #fff;">Layer 1:</strong> Redis (Fast access, 1-day retention)</p>
          <p><strong style="color: #fff;">Layer 2:</strong> PostgreSQL (Persistent storage)</p>
          <p><strong style="color: #fff;">Layer 3:</strong> Vector Database (Semantic search)</p>
          <p><strong style="color: #fff;">Layer 4:</strong> IPFS/Arweave (Permanent backup)</p>
        </div>
      </div>
    </div>
  `;
};

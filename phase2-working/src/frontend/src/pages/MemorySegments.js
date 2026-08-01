// Memory Segments Dashboard
let currentSegment = 'health';

export const MemorySegments = () => {
  const segments = [
    { id: 'health', name: 'Health', color: '#f08c29', icon: '❤️' },
    { id: 'finance', name: 'Finance', color: '#198038', icon: '💰' },
    { id: 'work', name: 'Work', color: '#0066cc', icon: '💼' },
    { id: 'personal', name: 'Personal', color: '#2070b0', icon: '👥' },
    { id: 'ideas', name: 'Ideas', color: '#3e2723', icon: '💡' },
    { id: 'tasks', name: 'Tasks', color: '#f08c29', icon: '📝' },
    { id: 'relationships', name: 'Relationships', color: '#0066cc', icon: '🤝' },
    { id: 'goals', name: 'Goals', color: '#198038', icon: '🎯' }
  ];

  const getSegmentData = (segment) => {
    const data = {
      health: { count: 347, connections: 89, last: 'Yesterday' },
      finance: { count: 284, connections: 67, last: '2 days ago' },
      work: { count: 512, connections: 156, last: 'Today' },
      personal: { count: 678, connections: 234, last: 'Yesterday' },
      ideas: { count: 234, connections: 128, last: '3 days ago' },
      tasks: { count: 456, connections: 189, last: 'Today' },
      relationships: { count: 198, connections: 156, last: 'Yesterday' },
      goals: { count: 145, connections: 67, last: '5 days ago' }
    };
    return data[segment] || { count: 0, connections: 0, last: 'Never' };
  };

  const data = getSegmentData(currentSegment);

  return `
    <div class="card">
      <h2>MEMORY SEGMENTS</h2>
      
      <div style="margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">SELECT SEGMENT</div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${segments.map(seg => `
            <button class="btn" onclick="setSegment('${seg.id}')" 
                    style="padding: 0.75rem 1.5rem; background: ${currentSegment === seg.id ? seg.color : '#0a0f1a'}; 
                           color: ${currentSegment === seg.id ? '#0a0f1a' : '#fff'}; 
                           border-color: ${seg.color}">
              ${seg.icon} ${seg.name}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Segment Statistics -->
      <div class="stats-grid">
        <div class="stat-box" style="border-color: ${data.color}">
          <div style="font-family: 'Orbitron', sans-serif; color: ${data.color};">TOTAL MEMORY</div>
          <div class="stat-value" style="color: ${data.color}">${data.count}</div>
          <div class="stat-label">Thoughts in ${currentSegment}</div>
        </div>
        <div class="stat-box" style="border-color: #198038;">
          <div style="font-family: 'Orbitron', sans-serif; color: #198038;">CONNECTIONS</div>
          <div class="stat-value" style="color: #198038;">${data.connections}</div>
          <div class="stat-label">Related ideas</div>
        </div>
        <div class="stat-box" style="border-color: #0066cc;">
          <div style="font-family: 'Orbitron', sans-serif; color: #0066cc;">LATEST ACTIVITY</div>
          <div class="stat-value" style="color: #0066cc;">${data.last}</div>
          <div class="stat-label">Recent addition</div>
        </div>
      </div>

      <!-- Segment Visualization -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: ${data.color}; margin-bottom: 1rem;">
        ${currentSegment.toUpperCase()} SEGMENT
      </h3>
      <div style="background: #0a0f1a; padding: 2rem; border-radius: 8px; border: 1px solid ${data.color}33; margin-bottom: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="font-size: 4rem; color: ${data.color}; margin-bottom: 1rem;">🧠</div>
          <div style="font-family: 'Orbitron', sans-serif; color: #fff; font-size: 1.5rem;">
            ${currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1)} Brain Area
          </div>
          <div style="color: ${data.color}; font-size: 1rem; margin-top: 0.5rem;">
            ${data.count} memories stored, ${data.connections} connections active
          </div>
        </div>

        <!-- Graph/Chart -->
        <div style="background: #000; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #aaa; font-family: 'Orbitron', sans-serif; font-size: 0.9rem; margin-bottom: 1rem;">
            MEMORY GROWTH (Last 30 Days)
          </div>
          <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 100px;">
            ${Array.from({ length: 30 }, (_, i) => {
              const height = Math.floor(Math.random() * 80 + 10);
              return `<div style="width: 2%; height: ${height}%; background: ${data.color}; border-radius: 2px 2px 0 0;"></div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Thought Navigation Lines -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: ${data.color}; margin-bottom: 1rem;">THOUGHT NAVIGATION</h3>
      <div style="margin-bottom: 2rem;">
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333; margin-bottom: 1rem;">
          <div style="color: #888; margin-bottom: 0.5rem;">COPY NAVIGATION LINE</div>
          <div style="background: #000; padding: 0.75rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.8rem; color: ${data.color}; overflow-x: auto;">
            const navigation = { segment: '${currentSegment}', related: ['${segments[0].id}', '${segments[1].id}'], connections: ${data.connections} };
          </div>
          <button class="btn" onclick="alert('Navigation line copied to clipboard!')" style="margin-top: 0.5rem; background: ${data.color}; color: #0a0f1a; padding: 0.3rem 0.8rem; font-size: 0.8rem;">
            COPY TO CLIPBOARD
          </button>
        </div>

        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #888; margin-bottom: 0.5rem;">THOUGHT GRAPH (JSON)</div>
          <div style="background: #000; padding: 0.75rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.7rem; color: #aaa; overflow-x: auto; max-height: 150px;">
            {\\n  "segment": "${currentSegment}",\\n  "memories": [${Array.from({ length: 5 }, (_, i) => `\\n    { id: 'mem_${i}', text: 'Thought ${i + 1}', connections: ${Math.floor(Math.random() * 10)} }`).join(',')}\\n  ],\\n  "connections": ${data.connections}\\n}
          </div>
        </div>
      </div>

      <!-- Related Segments -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: ${data.color}; margin-bottom: 1rem;">RELATED SEGMENTS</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        ${segments.filter(s => s.id !== currentSegment).map(seg => `
          <button class="btn" onclick="setSegment('${seg.id}')" 
                  style="padding: 0.75rem 1.5rem; background: #0a0f1a; border: 1px solid ${seg.color}; color: ${seg.color};">
            ${seg.icon} ${seg.name}
          </button>
        `).join('')}
      </div>
    </div>
    
    <script>
      window.setSegment = (segment) => {
        currentSegment = segment;
        document.querySelector('#main-content').innerHTML = MemorySegments();
      };
    </script>
  `;
};

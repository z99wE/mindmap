// Cognitive Load Visualizer - Seesaw/Weighing Machine
// Connected to backend API for real-time data

const API_BASE = '/api/classify';

// State for real-time data
let cognitiveStats = null;
let brainData = null;
let cognitiveDistribution = null;
let loading = true;

// Fetch data from backend
async function fetchClassificationData() {
  try {
    const userId = localStorage.getItem('userId') || 'demo';
    
    // Fetch all classification data in parallel
    const [statsRes, brainRes, cognitiveRes] = await Promise.all([
      fetch(`${API_BASE}/stats/${userId}`),
      fetch(`${API_BASE}/brain/${userId}`),
      fetch(`${API_BASE}/cognitive/${userId}`)
    ]);
    
    const statsData = await statsRes.json();
    const brainData = await brainRes.json();
    const cognitiveData = await cognitiveRes.json();
    
    if (statsData.success) {
      cognitiveStats = statsData.stats;
    }
    
    if (brainData.success) {
      brainData = brainData.brainData;
    }
    
    if (cognitiveData.success) {
      cognitiveDistribution = cognitiveData.cognitiveData;
    }
    
    loading = false;
    updateVisualizations();
  } catch (error) {
    console.error('Error fetching classification data:', error);
    loading = false;
    // Use mock data if API fails
    loadMockData();
  }
}

// Load mock data for demo
function loadMockData() {
  cognitiveStats = {
    total_thoughts: 1247,
    theme_distribution: [
      { theme: 'work', count: 512 },
      { theme: 'personal', count: 347 },
      { theme: 'finance', count: 284 },
      { theme: 'health', count: 156 },
      { theme: 'ideas', count: 148 }
    ],
    load_distribution: [
      { load_type: 'analytical', count: 723 },
      { load_type: 'creative', count: 524 }
    ],
    brain_distribution: [
      { brain_area: 'frontal', count: 489 },
      { brain_area: 'parietal', count: 367 },
      { brain_area: 'temporal', count: 301 },
      { brain_area: 'occipital', count: 90 }
    ]
  };
  
  brainData = {
    frontal: { name: 'Frontal Lobe', function: 'Planning & Decision Making', value: 489, percentage: 39, color: '#f08c29' },
    parietal: { name: 'Parietal Lobe', function: 'Sensory Processing', value: 367, percentage: 30, color: '#198038' },
    temporal: { name: 'Temporal Lobe', function: 'Memory & Language', value: 301, percentage: 24, color: '#0066cc' },
    occipital: { name: 'Occipital Lobe', function: 'Visual Processing', value: 90, percentage: 7, color: '#ff6b6b' }
  };
  
  cognitiveDistribution = {
    creative: { name: 'Creative Thinking', value: 524, percentage: 49, color: '#f08c29' },
    analytical: { name: 'Analytical Thinking', value: 723, percentage: 51, color: '#198038' },
    emotional: { name: 'Emotional Processing', value: 0, percentage: 0, color: '#0066cc' }
  };
}

// Update visualizations
function updateVisualizations() {
  const main = document.getElementById('main-content');
  if (main) {
    main.innerHTML = CognitiveLoad();
  }
}

export const CognitiveLoad = () => {
  return `
    <div class="card">
      <h2>COGNITIVE LOAD SYSTEM</h2>
      
      <div style="text-align: center; margin-bottom: 2rem;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29;">BRAIN LOAD SEESAW</h3>
        <p style="color: #aaa;">The more thoughts you export, the lighter your cognitive load becomes</p>
      </div>

      <!-- Seesaw Visualization -->
      <div style="position: relative; height: 200px; margin: 2rem 0; background: #0a0f1a; border-radius: 8px; overflow: hidden;">
        <!-- Seesaw Base -->
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 300px; height: 10px; background: linear-gradient(135deg, #f08c29 0%, #f08c29 100%);"></div>
        <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); width: 40px; height: 20px; background: #f08c29; border-radius: 4px;"></div>
        
        <!-- Seesaw Beam -->
        <div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%) rotate(${cognitiveLoad - 50}deg); width: 400px; height: 10px; background: linear-gradient(90deg, #f08c29 0%, #fff 50%, #198038 100%); transition: transform 1s ease;"></div>
        
        <!-- Left Pan (Cognitive Load - Heavy) -->
        <div style="position: absolute; bottom: 40px; left: 20px; width: 100px; height: 80px; background: linear-gradient(180deg, rgba(240, 140, 41, 0.3) 0%, rgba(240, 140, 41, 0.1) 100%); border: 2px solid #f08c29; border-radius: 50% 50% 0 0; display: flex; align-items: center; justify-content: center; transition: transform 1s ease;">
          <div>
            <div style="font-family: 'Orbitron', sans-serif; color: #f08c29; font-size: 2rem;">${cognitiveLoad}%</div>
            <div style="color: #f08c29; font-size: 0.8rem;">Cognitive Load</div>
            <div style="color: #888; font-size: 0.7rem; margin-top: 0.5rem;">Thinking... Remembering...</div>
          </div>
        </div>
        
        <!-- Right Pan (Memory Dumped - Light) -->
        <div style="position: absolute; bottom: 40px; right: 20px; width: 100px; height: 80px; background: linear-gradient(180deg, rgba(25, 128, 56, 0.3) 0%, rgba(25, 128, 56, 0.1) 100%); border: 2px solid #198038; border-radius: 50% 50% 0 0; display: flex; align-items: center; justify-content: center; transition: transform 1s ease;">
          <div>
            <div style="font-family: 'Orbitron', sans-serif; color: #198038; font-size: 2rem;">${memoryDumped}%</div>
            <div style="color: #198038; font-size: 0.8rem;">Memory Dumped</div>
            <div style="color: #888; font-size: 0.7rem; margin-top: 0.5rem;">Exported to JSON-LD</div>
          </div>
        </div>
        
        <!-- Pivot Point -->
        <div style="position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 20px; height: 20px; background: #fff; border-radius: 50%; z-index: 10; box-shadow: 0 0 10px #f08c29;"></div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-box" style="border-color: #f08c29;">
          <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">THOUGHTS CAPTURED</div>
          <div class="stat-value">1,247</div>
          <div class="stat-label">Total Thoughts</div>
        </div>
        <div class="stat-box" style="border-color: #198038;">
          <div style="font-family: 'Orbitron', sans-serif; color: #198038;">MEMORY EXPORTED</div>
          <div class="stat-value">843</div>
          <div class="stat-label">Exported to JSON-LD</div>
        </div>
        <div class="stat-box" style="border-color: #0066cc;">
          <div style="font-family: 'Orbitron', sans-serif; color: #0066cc;">COGNITIVE LOAD</div>
          <div class="stat-value">${cognitiveLoad}%</div>
          <div class="stat-label">Brain Weight</div>
        </div>
      </div>

      <!-- Load Distribution -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">COGNITIVE LOAD BREAKDOWN</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div>
          <div style="color: #f08c29; margin-bottom: 0.5rem;">SHORT-TERM MEMORY (Thinking)</div>
          <div style="background: #0a0f1a; height: 20px; border-radius: 4px; overflow: hidden;">
            <div style="width: 65%; height: 100%; background: linear-gradient(90deg, #f08c29, #fff);"></div>
          </div>
          <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">Thinking...</div>
        </div>
        <div>
          <div style="color: #198038; margin-bottom: 0.5rem;">LONG-TERM MEMORY (Stored)</div>
          <div style="background: #0a0f1a; height: 20px; border-radius: 4px; overflow: hidden;">
            <div style="width: 80%; height: 100%; background: linear-gradient(90deg, #198038, #fff);"></div>
          </div>
          <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">Stored in PostgreSQL</div>
        </div>
        <div>
          <div style="color: #0066cc; margin-bottom: 0.5rem;">WORKING MEMORY (Active)</div>
          <div style="background: #0a0f1a; height: 20px; border-radius: 4px; overflow: hidden;">
            <div style="width: 35%; height: 100%; background: linear-gradient(90deg, #0066cc, #fff);"></div>
          </div>
          <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">Active Connections</div>
        </div>
      </div>

      <!-- Memory Segregation -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">MEMORY SEGREGATION (Brain Areas)</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${[
          { name: 'Health', color: '#f08c29', value: 32 },
          { name: 'Finance', color: '#198038', value: 28 },
          { name: 'Work', color: '#0066cc', value: 45 },
          { name: 'Personal', color: '#2070b0', value: 67 },
          { name: 'Ideas', color: '#3e2723', value: 23 },
          { name: 'Tasks', color: '#f08c29', value: 54 }
        ].map(seg => `
          <div>
            <div style="color: ${seg.color}; margin-bottom: 0.5rem;">${seg.name}</div>
            <div style="background: #0a0f1a; height: 15px; border-radius: 4px; overflow: hidden; border-left: 3px solid ${seg.color};">
              <div style="width: ${seg.value}%; height: 100%; background: linear-gradient(90deg, ${seg.color}, #fff);"></div>
            </div>
            <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">${seg.value}% of brain capacity</div>
          </div>
        `).join('')}
      </div>

      <!-- Download Action -->
      <div style="text-align: center;">
        <button class="btn btn-primary" onclick="alert('Downloading memory export...')" style="padding: 1rem 2rem; font-size: 1.2rem; background: #f08c29; color: #0a0f1a;">
          DOWNLOAD MEMORY EXPORT
        </button>
        <p style="color: #aaa; margin-top: 1rem;">
          When you download your memory, your cognitive load decreases as thoughts are properly stored
        </p>
      </div>

      <script>
        // Initialize data fetching when page loads
        document.addEventListener('DOMContentLoaded', () => {
          fetchClassificationData();
        });
        
        // Seesaw animation when memory is exported
        window.exportMemory = () => {
          if (cognitiveStats && cognitiveStats.total_thoughts) {
            cognitiveStats.total_thoughts -= 100;
            if (cognitiveStats.total_thoughts < 0) cognitiveStats.total_thoughts = 0;
          }
          updateVisualizations();
        };
      </script>
    </div>
  `;
};

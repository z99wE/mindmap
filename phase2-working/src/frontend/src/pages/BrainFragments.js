// Brain Fragments Visualization
// Shows creative vs non-creative vs analytical thinking by brain area
// Connected to backend API

const API_BASE = '/api/classify';

let brainData = null;

async function fetchBrainFragments() {
  try {
    const userId = localStorage.getItem('userId') || 'demo';
    const response = await fetch(`${API_BASE}/brain/${userId}`);
    const data = await response.json();
    
    if (data.success) {
      brainData = data.brainData;
      renderBrainFragments();
    }
  } catch (error) {
    console.error('Error fetching brain fragments:', error);
    brainData = null;
    renderBrainFragments();
  }
}

function renderBrainFragments() {
  const main = document.getElementById('main-content');
  main.innerHTML = BrainFragments();
  
  // Add event listeners
  setTimeout(() => {
    document.querySelectorAll('.brain-fragment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const area = e.target.dataset.area;
        showBrainAreaDetails(area);
      });
    });
  }, 100);
}

function showBrainAreaDetails(area) {
  const areas = {
    frontal: {
      name: 'Frontal Lobe',
      function: 'Planning & Decision Making',
      description: 'Responsible for executive functions, decision making, and problem solving.',
      color: '#f08c29'
    },
    parietal: {
      name: 'Parietal Lobe',
      function: 'Sensory Processing',
      description: 'Processes sensory information from your body and environment.',
      color: '#198038'
    },
    temporal: {
      name: 'Temporal Lobe',
      function: 'Memory & Language',
      description: 'Handles memory formation and language comprehension.',
      color: '#0066cc'
    },
    occipital: {
      name: 'Occipital Lobe',
      function: 'Visual Processing',
      description: 'Processes visual information from your eyes.',
      color: '#ff6b6b'
    }
  };
  
  const areaData = areas[area] || areas.frontal;
  alert(`${areaData.name} (${areaData.function})\n\n${areaData.description}`);
}

export const BrainFragments = () => {
  const defaultData = {
    frontal: { name: 'Frontal Lobe', function: 'Planning & Decision Making', value: 40, percentage: 40, color: '#f08c29' },
    parietal: { name: 'Parietal Lobe', function: 'Sensory Processing', value: 30, percentage: 30, color: '#198038' },
    temporal: { name: 'Temporal Lobe', function: 'Memory & Language', value: 20, percentage: 20, color: '#0066cc' },
    occipital: { name: 'Occipital Lobe', function: 'Visual Processing', value: 10, percentage: 10, color: '#ff6b6b' }
  };
  
  const data = brainData || defaultData;
  
  // Calculate creative vs analytical by brain area
  const creativeAreas = ['frontal', 'temporal'];
  const analyticalAreas = ['parietal', 'occipital'];
  
  const creativeTotal = creativeAreas.map(a => data[a]?.percentage || 0).reduce((a, b) => a + b, 0);
  const analyticalTotal = analyticalAreas.map(a => data[a]?.percentage || 0).reduce((a, b) => a + b, 0);
  
  return `
    <div class="card">
      <h2>BRAIN FRAGMENTS</h2>
      
      <div style="text-align: center; margin-bottom: 2rem;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29;">HOW YOUR BRAIN THINKS</h3>
        <p style="color: #aaa;">Visualizing your cognitive strengths by brain area</p>
      </div>

      <!-- Brain Fragment Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${Object.entries(data).map(([area, frag]) => `
          <div class="brain-fragment-btn" data-area="${area}" 
               style="background: #0a0f1a; border: 2px solid ${frag.color}; border-radius: 8px; padding: 1.5rem; cursor: pointer; transition: all 0.3s;">
            <div style="font-family: 'Orbitron', sans-serif; color: ${frag.color}; font-size: 1.1rem; margin-bottom: 0.5rem;">
              ${frag.name}
            </div>
            <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">${frag.function}</div>
            <div style="background: #000; height: 20px; border-radius: 4px; overflow: hidden;">
              <div style="width: ${frag.percentage}%; height: 100%; background: ${frag.color};"></div>
            </div>
            <div style="color: ${frag.color}; font-size: 1rem; font-weight: bold; text-align: right; margin-top: 0.5rem;">
              ${frag.percentage}% of Thoughts
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Thinking Style Analysis -->
      <div style="background: #0a0f1a; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">THINKING STYLE ANALYSIS</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <!-- Creative Thinking -->
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">Creative Thinking</div>
            </div>
            <div style="background: #000; height: 30px; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
              <div style="width: ${creativeTotal}%; height: 100%; background: linear-gradient(90deg, #f08c29, #fff);"></div>
            </div>
            <div style="color: #888; font-size: 0.8rem;">
              ${creativeTotal}% of thoughts are creative (Frontal & Temporal lobes)
            </div>
          </div>
          
          <!-- Analytical Thinking -->
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <div style="font-family: 'Orbitron', sans-serif; color: #198038;">Analytical Thinking</div>
            </div>
            <div style="background: #000; height: 30px; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
              <div style="width: ${analyticalTotal}%; height: 100%; background: linear-gradient(90deg, #198038, #fff);"></div>
            </div>
            <div style="color: #888; font-size: 0.8rem;">
              ${analyticalTotal}% of thoughts are analytical (Parietal & Occipital lobes)
            </div>
          </div>
        </div>
      </div>

      <!-- Thought Themes by Brain Area -->
      <div style="background: #0a0f1a; border-radius: 8px; padding: 1.5rem;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">THOUGHT THEMES BY BRAIN AREA</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          <div>
            <div style="color: #f08c29; font-family: 'Orbitron', sans-serif; margin-bottom: 0.5rem;">Frontal Lobe</div>
            <div style="color: #888; font-size: 0.8rem;">
              Planning & Goals<br>
              Decision Making<br>
              New Ideas
            </div>
          </div>
          
          <div>
            <div style="color: #198038; font-family: 'Orbitron', sans-serif; margin-bottom: 0.5rem;">Parietal Lobe</div>
            <div style="color: #888; font-size: 0.8rem;">
              Numbers & Finance<br>
              Work Tasks<br>
              Logistics
            </div>
          </div>
          
          <div>
            <div style="color: #0066cc; font-family: 'Orbitron', sans-serif; margin-bottom: 0.5rem;">Temporal Lobe</div>
            <div style="color: #888; font-size: 0.8rem;">
              Relationships<br>
              Memories<br>
              Music & Art
            </div>
          </div>
          
          <div>
            <div style="color: #ff6b6b; font-family: 'Orbitron', sans-serif; margin-bottom: 0.5rem;">Occipital Lobe</div>
            <div style="color: #888; font-size: 0.8rem;">
              Visualizing<br>
              Images<br>
              Spatial
            </div>
          </div>
        </div>
      </div>

      <script>
        // Initialize data fetching
        document.addEventListener('DOMContentLoaded', () => {
          fetchBrainFragments();
        });
      </script>
    </div>
  `;
};

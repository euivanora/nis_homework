let reviews = [];
let sentimentPipeline = null;
let gasUrl = localStorage.getItem('gas_url') || '';

// DOM elements
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingEl = document.getElementById("loading");
const statusEl = document.getElementById("status");
const gasUrlInput = document.getElementById("gas-url");
const saveGasBtn = document.getElementById("save-gas");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (gasUrl) gasUrlInput.value = gasUrl;
  
  // Save GAS URL
  saveGasBtn.addEventListener("click", () => {
    const url = gasUrlInput.value.trim();
    if (url && url.endsWith('/exec')) {
      localStorage.setItem('gas_url', url);
      gasUrl = url;
      showStatus('Logger URL saved! ❤️', 'success');
    } else {
      showStatus('URL must end with /exec ❌', 'error');
    }
  });

  // Load data
  loadReviews();
  initModel();

  // Analyze button
  analyzeBtn.addEventListener("click", analyzeRandomReview);
});

// Load reviews from TSV
function loadReviews() {
  fetch("reviews_test.tsv")
    .then(response => response.ok ? response.text() : Promise.reject())
    .then(tsv => {
      Papa.parse(tsv, {
        header: true,
        delimiter: "\t",
        complete: results => {
          reviews = results.data
            .map(row => row.text)
            .filter(text => typeof text === "string" && text.trim());
        }
      });
    })
    .catch(() => {
      console.warn("Failed to load reviews_test.tsv");
    });
}

// Initialize AI model
async function initModel() {
  try {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm');
    sentimentPipeline = await pipeline('sentiment-analysis');
    loadingEl.style.display = "none";
  } catch (error) {
    console.error("Model failed to load:", error);
    loadingEl.textContent = "AI heart is tired 😢 (check internet)";
    loadingEl.style.color = "#c62828";
  }
}

// Analyze a random review
async function analyzeRandomReview() {
  // Reset UI
  hideStatus();
  reviewText.style.display = "none";
  sentimentResult.style.display = "none";

  // Validate state
  if (!reviews || reviews.length === 0) {
    showStatus("No reviews loaded yet ❌", "error");
    return;
  }

  // Get random review
  const review = reviews[Math.floor(Math.random() * reviews.length)];
  reviewText.textContent = `"${review}"`;
  reviewText.style.display = "block";

  // Disable button during analysis
  analyzeBtn.disabled = true;

  try {
    // Run local AI model
    const result = await sentimentPipeline(review);
    const label = result[0].label.toUpperCase();
    const score = result[0].score;

    // Determine icon and color
    let icon, color;
    if (label === "POSITIVE") {
      icon = "fa-thumbs-up";
      color = "#2e7d32";
    } else if (label === "NEGATIVE") {
      icon = "fa-thumbs-down";
      color = "#c62828";
    } else {
      icon = "fa-question-circle";
      color = "#5d4037";
    }

    // Display result
    sentimentResult.innerHTML = `
      <i class="fas ${icon}" style="color:${color}; margin-right:10px;"></i>
      ${label} (${(score * 100).toFixed(1)}% sure!)
    `;
    sentimentResult.style.display = "block";

    // Log to Google Sheets
    if (gasUrl) {
      const params = new URLSearchParams();
      params.append('review', review);
      params.append('sentiment', label);
      params.append('confidence', score.toString());
      try {
        await fetch(gasUrl, { method: 'POST', body: params });
      } catch (e) {
        console.warn("Log to Sheets failed:", e);
      }
    }

    showStatus('Mood checked! ❤️', 'success');
  } catch (error) {
    console.error("Analysis error:", error);
    showStatus('Analysis failed ❌', 'error');
  } finally {
    // Always re-enable button
    analyzeBtn.disabled = false;
  }
}

// Status helpers
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = "block";
  setTimeout(() => {
    statusEl.style.display = "none";
  }, 4000);
}

function hideStatus() {
  statusEl.style.display = "none";
}

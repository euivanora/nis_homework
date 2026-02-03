// Global variables
let reviews = [];
let sentimentPipeline = null;

// DOM elements
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error-message");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadReviews();
  initModel();
  analyzeBtn.addEventListener("click", analyzeRandomReview);
});

// Load reviews
function loadReviews() {
  fetch("reviews_test.tsv")
    .then(response => {
      if (!response.ok) throw new Error("File not found");
      return response.text();
    })
    .then(tsv => {
      Papa.parse(tsv, {
        header: true,
        delimiter: "\t",
        complete: results => {
          reviews = results.data
            .map(row => row.text)
            .filter(text => typeof text === "string" && text.trim() !== "");
        }
      });
    })
    .catch(err => showError("Could not load reviews"));
}

// Initialize AI model
async function initModel() {
  try {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm');
    sentimentPipeline = await pipeline('sentiment-analysis');
    loadingEl.style.display = "none";
  } catch (e) {
    showError("AI model failed to load. Check internet.");
  }
}

// Analyze review
async function analyzeRandomReview() {
  if (!reviews.length) return showError("No reviews loaded");
  if (!sentimentPipeline) return showError("AI is still loading...");

  const review = reviews[Math.floor(Math.random() * reviews.length)];
  reviewText.textContent = `"${review}"`;
  reviewText.style.display = "block";
  sentimentResult.style.display = "none";
  analyzeBtn.disabled = true;
  hideError();

  try {
    const result = await sentimentPipeline(review);
    const label = result[0].label.toUpperCase();
    const score = result[0].score;

    let icon = "fa-question-circle";
    let color = "#5d4037";
    if (label === "POSITIVE") {
      icon = "fa-thumbs-up";
      color = "#2e7d32";
    } else if (label === "NEGATIVE") {
      icon = "fa-thumbs-down";
      color = "#c62828";
    }

    sentimentResult.innerHTML = `
      <i class="fas ${icon}" style="color:${color}; margin-right:8px;"></i>
      ${label} (${(score * 100).toFixed(1)}%)
    `;
    sentimentResult.style.display = "block";
  } catch (e) {
    showError("Analysis failed");
  } finally {
    analyzeBtn.disabled = false;
  }
}

// Helpers
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}
function hideError() {
  errorEl.style.display = "none";
}

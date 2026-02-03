// Используем transformers.js напрямую (локальная модель, без Hugging Face API)
import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";

let reviews = [];
let sentimentPipeline = null;
let gasUrl = localStorage.getItem('gas_url') || '';

const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingEl = document.getElementById("loading");
const statusEl = document.getElementById("status");
const gasUrlInput = document.getElementById("gas-url");
const saveGasBtn = document.getElementById("save-gas");

document.addEventListener("DOMContentLoaded", () => {
  if (gasUrl) gasUrlInput.value = gasUrl;
  
  saveGasBtn.onclick = () => {
    const url = gasUrlInput.value.trim();
    if (url && url.endsWith('/exec')) {
      localStorage.setItem('gas_url', url);
      gasUrl = url;
      showStatus('Logger URL saved! ❤️', 'success');
    } else {
      showStatus('URL must end with /exec ❌', 'error');
    }
  };

  loadReviews();
  initModel();
  analyzeBtn.onclick = analyzeRandomReview;
});

function loadReviews() {
  fetch("reviews_test.tsv")
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(tsv => {
      Papa.parse(tsv, {
        header: true,
        delimiter: "\t",
        complete: r => {
          reviews = r.data.map(row => row.text).filter(t => t?.trim());
        }
      });
    })
    .catch(() => console.warn("TSV load failed"));
}

async function initModel() {
  try {
    sentimentPipeline = await pipeline('sentiment-analysis');
    loadingEl.style.display = "none";
  } catch (e) {
    loadingEl.textContent = "AI heart is tired 😢";
    loadingEl.style.color = "#c62828";
  }
}

async function analyzeRandomReview() {
  hideStatus();
  if (!reviews.length) return showStatus("No reviews loaded ❌", "error");
  if (!sentimentPipeline) return showStatus("AI is loading... wait ❤️", "error");

  const review = reviews[Math.floor(Math.random() * reviews.length)];
  reviewText.textContent = `"${review}"`;
  reviewText.style.display = "block";
  sentimentResult.style.display = "none";
  analyzeBtn.disabled = true;

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

    sentimentResult.innerHTML = `<i class="fas ${icon}" style="color:${color}; margin-right:10px;"></i> ${label} (${(score*100).toFixed(1)}%)`;
    sentimentResult.style.display = "block";

    // ➤➤➤ ЛОГИРОВАНИЕ В GOOGLE SHEETS
    if (gasUrl) {
      const params = new URLSearchParams();
      params.append('review', review);
      params.append('sentiment', label);
      params.append('confidence', score.toString());
      fetch(gasUrl, { method: 'POST', body: params }).catch(() => {});
    }

    showStatus('Mood checked! Logged to Sheets ❤️', 'success');
  } catch (e) {
    showStatus("Analysis failed ❌", "error");
  } finally {
    analyzeBtn.disabled = false;
  }
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  statusEl.style.display = "block";
  setTimeout(() => statusEl.style.display = "none", 4000);
}
function hideStatus() {
  statusEl.style.display = "none";
}

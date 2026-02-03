// Используем transformers.js напрямую через CDN
import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";

let reviews = [];
let sentimentPipeline = null;

const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");

document.addEventListener("DOMContentLoaded", () => {
  loadReviews();
  initModel();
  analyzeBtn.addEventListener("click", analyzeRandomReview);
});

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

async function initModel() {
  try {
    sentimentPipeline = await pipeline('sentiment-analysis');
  } catch (e) {
    showError("AI model failed to load. Check internet.");
  }
}

async function analyzeRandomReview() {
  hideError();
  if (!reviews.length) return showError("No reviews loaded");
  if (!sentimentPipeline) return showError("AI is loading...");

  const review = reviews[Math.floor(Math.random() * reviews.length)];
  reviewText.textContent = `"${review}"`;
  reviewText.style.display = "block";
  
  loadingElement.style.display = "block";
  analyzeBtn.disabled = true;
  sentimentResult.style.display = "none";

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

    // ➤➤➤ ЛОГИРОВАНИЕ В GOOGLE SHEETS
    const gasUrl = "https://script.google.com/macros/s/AKfycbze8hqx5FV5LdXgDwULK8dQR3uGaCbdcIWZJw9nbo9UsPOrea1_egbdloBXXwhouXZm/exec";
    const params = new URLSearchParams();
    params.append('review', review);
    params.append('sentiment', label);
    params.append('confidence', score.toString());
    fetch(gasUrl, { method: 'POST', body: params }).catch(() => {});
    
  } catch (e) {
    showError("Analysis failed");
  } finally {
    loadingElement.style.display = "none";
    analyzeBtn.disabled = false;
  }
}

function showError(msg) {
  errorElement.textContent = msg;
  errorElement.style.display = "block";
}
function hideError() {
  errorElement.style.display = "none";
}

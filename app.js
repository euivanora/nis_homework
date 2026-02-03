// app.js (ES module version using transformers.js for local sentiment classification)
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// Global variables
let reviews = [];
let apiToken = ""; // kept for UI compatibility, but not used with local inference
let sentimentPipeline = null; // transformers.js text-classification pipeline

// DOM elements
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");
const statusElement = document.getElementById("status"); // optional status label for model loading

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  // Load the TSV file (Papa Parse)
  loadReviews();
  // Set up event listeners
  analyzeBtn.addEventListener("click", analyzeRandomReview);
  apiTokenInput.addEventListener("change", saveApiToken);
  // Load saved API token if exists (not used with local inference but kept for UI)
  const savedToken = localStorage.getItem("hfApiToken");
  if (savedToken) {
    apiTokenInput.value = savedToken;
    apiToken = savedToken;
  }
  // Initialize transformers.js sentiment model
  initSentimentModel();
});

// Initialize transformers.js text-classification pipeline with a supported model
async function initSentimentModel() {
  try {
    if (statusElement) {
      statusElement.textContent = "Warming up the AI heart... 💖";
    }
    // Use a transformers.js-supported text-classification model.
    // Xenova/distilbert-base-uncased-finetuned-sst-2-english is a common choice.
    sentimentPipeline = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );

    if (statusElement) {
      statusElement.textContent = "Ready to feel the mood! ✨";
    }
  } catch (error) {
    console.error("Failed to load sentiment model:", error);
    showError(
      "Oops! Couldn't load the mood detector. Please check your internet and try again. ❤️"
    );
    if (statusElement) {
      statusElement.textContent = "Heart needs a hug... try reloading?";
    }
  }
}

// Load and parse the TSV file using Papa Parse
function loadReviews() {
  fetch("reviews_test.tsv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Couldn't find the reviews file 😢");
      }
      return response.text();
    })
    .then((tsvData) => {
      Papa.parse(tsvData, {
        header: true,
        delimiter: "\t",
        complete: (results) => {
          reviews = results.data
            .map((row) => row.text)
            .filter((text) => typeof text === "string" && text.trim() !== "");
          console.log("Loaded ", reviews.length, " reviews 💕");
        },
        error: (error) => {
          console.error("TSV parse error: ", error);
          showError("Hmm... couldn't read the reviews file. Is it formatted correctly? 💔");
        },
      });
    })
    .catch((error) => {
      console.error("TSV load error: ", error);
      showError("Failed to load reviews. Make sure reviews_test.tsv is in the same folder! 💔");
    });
}

// Save API token to localStorage (UI compatibility; not used with local inference)
function saveApiToken() {
  apiToken = apiTokenInput.value.trim();
  if (apiToken) {
    localStorage.setItem("hfApiToken", apiToken);
  } else {
    localStorage.removeItem("hfApiToken");
  }
}

// Analyze a random review
function analyzeRandomReview() {
  hideError();
  if (!Array.isArray(reviews) || reviews.length === 0) {
    showError("No reviews to check yet... be patient! 💕");
    return;
  }
  if (!sentimentPipeline) {
    showError("The AI heart is still warming up... wait a sec! ❤️");
    return;
  }
  const selectedReview =
    reviews[Math.floor(Math.random() * reviews.length)];
  // Display the review
  reviewText.textContent = selectedReview;
  reviewText.style.display = "block";
  // Show loading state
  loadingElement.style.display = "block";
  analyzeBtn.disabled = true;
  sentimentResult.innerHTML = ""; // Reset previous result
  sentimentResult.className = "sentiment-result"; // Reset classes
  // Call local sentiment model (transformers.js)
  analyzeSentiment(selectedReview)
    .then((result) => displaySentiment(result))
    .catch((error) => {
      console.error("Error:", error);
      showError(error.message || "Something went wrong while feeling the mood... 💔");
    })
    .finally(() => {
      loadingElement.style.display = "none";
      analyzeBtn.disabled = false;
    });
}

// Call local transformers.js pipeline for sentiment classification
async function analyzeSentiment(text) {
  if (!sentimentPipeline) {
    throw new Error("AI heart isn't ready yet!");
  }
  // transformers.js text-classification pipeline returns:
  // [{ label: 'POSITIVE', score: 0.99 }, ...]
  const output = await sentimentPipeline(text);
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("The AI didn't understand this review... 💭");
  }
  // Wrap to match [[{ label, score }]] shape expected by displaySentiment
  return [output];
}

// Display sentiment result
function displaySentiment(result) {
  // Default to neutral if we can't parse the result
  let sentiment = "neutral";
  let score = 0.5;
  let label = "NEUTRAL";
  // Expected format: [[{label: 'POSITIVE', score: 0.99}]]
  if (
    Array.isArray(result) &&
    result.length > 0 &&
    Array.isArray(result[0]) &&
    result[0].length > 0
  ) {
    const sentimentData = result[0][0];
    if (sentimentData && typeof sentimentData === "object") {
      label =
        typeof sentimentData.label === "string"
          ? sentimentData.label.toUpperCase()
          : "NEUTRAL";
      score =
        typeof sentimentData.score === "number"
          ? sentimentData.score
          : 0.5;

      // Determine sentiment bucket
      if (label === "POSITIVE" && score > 0.5) {
        sentiment = "positive";
      } else if (label === "NEGATIVE" && score > 0.5) {
        sentiment = "negative";
      } else {
        sentiment = "neutral";
      }
    }
  }
  // Update UI
  sentimentResult.classList.add(sentiment);
  sentimentResult.innerHTML = `<i class="fas ${getSentimentIcon(sentiment)} icon"></i> <span>${label} (${(score * 100).toFixed(1)}% sure!)</span>`;
  sentimentResult.style.display = "block";
}

// Get appropriate icon for sentiment bucket
function getSentimentIcon(sentiment) {
  switch (sentiment) {
    case "positive":
      return "fa-thumbs-up";
    case "negative":
      return "fa-thumbs-down";
    default:
      return "fa-question-circle";
  }
}

// Show error message
function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

// Hide error message
function hideError() {
  errorElement.style.display = "none";
}
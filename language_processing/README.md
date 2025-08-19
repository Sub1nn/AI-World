# Text Classification Projects

This folder contains my machine learning assignments for text based classification using Naive Bayes.

## Projects

### 1. BBC News Classification

- **File**: `text_classification.ipynb`
- **Dataset**: BBC news articles
- **Task**: Classify news articles into categories (politics, sports, business, tech, entertainment)
- **Method**: TF-IDF + Naive Bayes

### 2. Twitter Sentiment Analysis

- **File**: `twitter_sentiment_analysis.ipynb`
- **Dataset**: Twitter tweets
- **Task**: Classify tweets as Positive or Negative sentiment
- **Method**: TF-IDF + Naive Bayes

## What I Learned

- Text preprocessing (cleaning, tokenization, lemmatization)
- TF-IDF vectorization for converting text to numbers
- Naive Bayes classifier for text classification
- Model evaluation using accuracy and confusion matrix

## Libraries Used

- pandas - for data handling
- nltk - for text processing
- scikit-learn - for machine learning
- matplotlib - for plotting graphs

## Results

**BBC News Classification:**

- Accuracy: ~97%
- Works well for categorizing different types of news and text based classification

**Twitter Sentiment Analysis:**

- Accuracy: ~89%
- Good at detecting positive vs negative tweets

## How to Run

1. Install required libraries:

   ```
   pip install pandas nltk scikit-learn matplotlib
   ```

2. Download NLTK data (run once):

   ```python
   import nltk
   nltk.download('punkt')
   nltk.download('stopwords')
   nltk.download('wordnet')
   ```

3. Open the jupyter notebooks and run all cells

## Notes

- Both projects use similar approach: preprocess text → vectorize → train model → evaluate
- TF-IDF works better than simple word counts for text classification
- Naive Bayes is fast and works well for text data
- Preprocessing is very important for good results

---

_Made for AIML course assignment_

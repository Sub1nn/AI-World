import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error

# Input data (features)
X = np.array([[30], [50], [70], [90]])  # House size in m²

# Output data (targets)
y = np.array([100, 150, 200, 250])      # Price in k€

# Create and train the linear regression model
model = LinearRegression()
model.fit(X, y)

# Get the slope (w) and intercept (b)
slope = model.coef_[0]
intercept = model.intercept_

print(f"Best-fit line: y = {slope:.2f}x + {intercept:.2f}")

# Generate predictions for plotting
x_range = np.linspace(20, 100, 100).reshape(-1, 1)
y_pred = model.predict(x_range)

# Calculate Mean Squared Error
mse = mean_squared_error(y, model.predict(X))
print(f"Mean Squared Error: {mse:.2f}")

# Plot the data and the best-fit line
plt.scatter(X, y, color='blue', label='Actual data')
plt.plot(x_range, y_pred, color='red', label='Best-fit line')

# Add intercept marker
plt.axhline(y=intercept, color='green', linestyle='--', label=f'Intercept = {intercept:.2f}')
plt.axvline(x=0, color='gray', linestyle='dotted')

# Labels and legend
plt.title('House Price vs. Size with Best-Fit Line')
plt.xlabel('House Size (m²)')
plt.ylabel('Price (k€)')
plt.legend()
plt.grid(True)
plt.show()

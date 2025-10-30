data = [1, "A", 0, False, True]
filtered_data = filter(None, data)
print(filtered_data)
print(list(filtered_data))  # Output: [1, 'A', True]

filtered_data = [i for i in data if i]
print(filtered_data)  # Output: [1, 'A', True]

list_char = ["a", "p", "t", "i", "y", "l"]
vowel = ["a", "e", "i", "o", "u"]

# Using list comprehension
filtered_list = [ char for char in list_char if char in vowel]
print(filtered_list)

# using normal for loop
only_vowel = []
for item in list_char:
    if item in vowel:
        only_vowel.append(item)

'''
- A loop has an extra performance cost because you need to
append the item into the list each time, which you dont need to do in list
comprehension.
- Similarly, the filter and map functions have an extra cost to call the
functions compared to list comprehension.
- If you dont have a complex condition or complex computation in the
for loop, you should consider using list comprehension. But if you are
doing many things in a loop, its better to stick with a loop for readability
purposes.
'''
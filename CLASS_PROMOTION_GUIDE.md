# Class Promotion System - User Guide

## Class Structure

### Classes 1-10
Each class has two sections: A and B
- 1A, 1B
- 2A, 2B
- 3A, 3B
- ... up to ...
- 10A, 10B

### Classes 11-12
Each class has two streams (Science and Commerce), each with two sections (A and B)
- 11A-Science, 11B-Science
- 11A-Commerce, 11B-Commerce
- 12A-Science, 12B-Science
- 12A-Commerce, 12B-Commerce

## Promotion Rules

### Rule 1: Section Preservation
Students in section A will always be promoted to section A.
Students in section B will always be promoted to section B.

**Examples:**
- 1A → 2A → 3A → ... → 10A
- 1B → 2B → 3B → ... → 10B

### Rule 2: Class 10 to 11 Transition
When promoting students from class 10 to class 11, you MUST select a stream:
- Science
- Commerce

The section is preserved during this transition.

**Examples:**
- 10A + Science → 11A-Science
- 10A + Commerce → 11A-Commerce
- 10B + Science → 11B-Science
- 10B + Commerce → 11B-Commerce

### Rule 3: Stream Preservation (Classes 11-12)
Once a student is in a stream, they stay in that stream.

**Examples:**
- 11A-Science → 12A-Science
- 11B-Science → 12B-Science
- 11A-Commerce → 12A-Commerce
- 11B-Commerce → 12B-Commerce

## How to Promote Students

### Step 1: Navigate to Student Academic Actions
1. Go to Students page
2. Click on a student
3. Click on "Academic Actions" tab

### Step 2: Select Promotion Action
1. Click "Perform Action" button
2. Select "Promote" from the dropdown

### Step 3: Select Stream (Class 10 Only)
If the student is in class 10 (10A or 10B):
1. A "Select Stream for Class 11" dropdown will appear
2. Choose either "Science" or "Commerce"
3. You'll see a preview: "Student will be promoted to class 11A-Science" (or similar)

### Step 4: Provide Reason
1. Enter a reason for the promotion (minimum 10 characters)
2. Example: "Completed academic year successfully with good grades"

### Step 5: Confirm
1. Click "Confirm Promote" button
2. The student will be promoted to the next class

## Adding New Students

When adding a new student:

1. Fill in student details
2. For "Class Section", select from the dropdown:
   - For classes 1-10: Choose from 1A, 1B, 2A, 2B, ..., 10A, 10B
   - For class 11: Choose from 11A-Science, 11B-Science, 11A-Commerce, 11B-Commerce
   - For class 12: Choose from 12A-Science, 12B-Science, 12A-Commerce, 12B-Commerce

## Complete Promotion Flow Examples

### Example 1: Section A Student (Science Stream)
```
1A → 2A → 3A → 4A → 5A → 6A → 7A → 8A → 9A → 10A
                                                ↓ (Select Science)
                                          11A-Science
                                                ↓
                                          12A-Science
```

### Example 2: Section B Student (Commerce Stream)
```
1B → 2B → 3B → 4B → 5B → 6B → 7B → 8B → 9B → 10B
                                                ↓ (Select Commerce)
                                          11B-Commerce
                                                ↓
                                          12B-Commerce
```

### Example 3: Mixed Scenario
```
Student starts in 5A:
5A → 6A → 7A → 8A → 9A → 10A → (Select Science) → 11A-Science → 12A-Science

Student starts in 8B:
8B → 9B → 10B → (Select Commerce) → 11B-Commerce → 12B-Commerce
```

## Important Notes

1. **Section is Permanent**: Once a student is in section A or B, they stay in that section throughout their school career.

2. **Stream Selection is Required**: You cannot promote a class 10 student without selecting a stream.

3. **Stream is Permanent**: Once a student chooses Science or Commerce in class 11, they stay in that stream through class 12.

4. **Class Teachers**: Class teachers can only promote students from their assigned class.

5. **Validation**: The system will prevent invalid promotions (e.g., promoting a class 12 student, promoting without selecting a stream for class 10).

## Troubleshooting

### "Please select a stream for class 11"
- This appears when promoting a class 10 student
- Solution: Select either "Science" or "Commerce" from the stream dropdown

### "Student is already in the highest class"
- This appears when trying to promote a class 12 student
- Solution: Class 12 is the highest class, students cannot be promoted further

### "You can only perform academic actions on students from your assigned class"
- This appears for class teachers trying to promote students from other classes
- Solution: Only promote students from your assigned class, or contact the headmaster

## Visual Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    PROMOTION WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

Classes 1-9:
  Current Class → Next Class (Section Preserved)
  Example: 5A → 6A, 5B → 6B

Class 10 → 11:
  Current Class → Select Stream → Next Class
  Example: 10A → [Science/Commerce] → 11A-Science or 11A-Commerce

Class 11 → 12:
  Current Class → Next Class (Section & Stream Preserved)
  Example: 11A-Science → 12A-Science

Class 12:
  Cannot promote (Highest class)
```

## Summary

The new class promotion system ensures:
- ✓ Students stay in their section (A or B)
- ✓ Proper stream selection for class 10 to 11 transition
- ✓ Stream preservation from class 11 to 12
- ✓ Clear dropdown selection when adding new students
- ✓ Validation to prevent errors

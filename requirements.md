# Templating Requirements

This document outlines the requirements and conventions for the email templating system.

## Template Variables

There are two types of variables used in the email templates:

### 1. Handlebars Variables (`{{...}}`)

-   **Syntax:** `{{variableName}}`
-   **Source:** These variables are populated by the backend server (`server.js`).
-   **Data Source:** The data for these variables comes from the JSON files located in the `data/venues/` directory (e.g., `SoulBar.json`).
-   **Purpose:** Used for venue-specific information that is known at the time of rendering, such as header images, addresses, and links.

**Example:**

```html
<img src="{{headerImage}}" width="600" alt="{{templateTitle}}">
```

In this example, `headerImage` and `templateTitle` are supplied by the corresponding venue's JSON file.

### 2. External System Placeholders (`[...]`)

-   **Syntax:** `[PLACEHOLDER_NAME]`
-   **Source:** These placeholders are **not** processed by this application. They are intended to be replaced by an external system that consumes the rendered HTML output.
-   **Purpose:** Used for booking-specific information that is not available to this application, such as customer names, booking times, and confirmation numbers.

**Example:**

```html
<p>Dear [FULLNAME]</p>
<p>Table reservation for <strong>[COVERS]</strong> people on <strong>[DATE]</strong> at <strong>[TIME]</strong></p>
```

In this example, `[FULLNAME]`, `[COVERS]`, `[DATE]`, and `[TIME]` are expected to be replaced by a downstream application.

## Best Practices

-   When editing templates, use `{{...}}` for data that is stored in the `data/venues/` JSON files.
-   Use `[...]` for data that will be injected later by the external booking system.
-   Do not mix the two syntaxes for the same purpose.

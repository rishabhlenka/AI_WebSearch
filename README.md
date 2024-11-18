# Workflow LLM Automation with React and Node.js

This project provides a full-stack application that allows users to create,
update, delete, and execute automated workflows using large language models
(LLMs). The frontend is built using React (Vite), and the backend uses Node.js
with an SQLite database. The backend fetches content from provided URLs and
processes tasks using the OpenAI API.

# Prerequisites

    Node.js and npm (or Yarn) installed on your machine.

    SQLite for database handling.

    OpenAI API Key to enable LLM-powered workflow execution.

# Backend Setup

1.  Navigate to the backend directory

            `cd backend`

2.  Install dependencies

            `npm install`

3.  Create an .env file in the backend folder and add your OpenAI API Key

            `OPENAI_API_KEY=your-openai-api-key`

4.  Run the backend server

            `npm start`

# Frontend Setup

1.  Navigate to the frontend directory

            `cd frontend`

2.  Install dependencies

            `npm install`

3.  Run the frontend server

            `npm run dev`

# SQLite Database

The backend uses SQLite as the database. The database file workflow.db will be
automatically created when you start the backend.

# Endpoints

1. Get /workflows: Fetch all workflows.

2. POST /workflows: Create a new workflow.

3. PUT /workflows/{id}: Update an existing workflow by ID.

4. DELETE /workflows/{id}: Delete a workflow by ID.

5. POST /workflows/{id}/execute: Execute a workflow by fetching URL content and
   passing it to the LLM.

6. (INCOMPLETE) POST /suggestWorkflow: Generate a suggested workflow using AI
   based on input.

# Design

1. SQLite was chosen for its simplicity, lightweight system and sufficiency for
   local dev.

2. OpenAI was chosen for LLM development, and LangChain was chosen to chain
   prompts.

# Assumptions

1. Users will provide valid information (URLs) that return accessible HTML
   content. The body should contain relevant text for processing.

2. LLMs are responsible for returning task-based information based on provided
   user prompts, content and description.

# Limitations

1. This app only parses through the first 8000 characters of the fetched URL
   content to avoid overloading the LLM.

2. There are only basic error handling systems.

3. AI workflow suggestion is not fully implemented due to lack of time.

# Future Improvements

1. Pagination for workflows or infinite scrolling

2. Enhancing AI suggestions with better prompt engineering.

3. URL validation

4. Improving workflows by parsing not only text data, but audio and video data.

5. Improving workflows by connecting not only to URLs, but multiple types of
   data, including PDFs, CSVs, SQL databases, etc.

6. Third-party API integration (CRMs, project management tools, data sources)

7. AI-Enhanced Content Processing: Using LangChain to improve content
   summarization and chaining multiple types of tasks in the same API call.

# Scalability

1. SQLite should be replaced with PostgreSQL or MongoDB for larger datasets.

2. Caching: Cache workflows and external URL calls to reduce repeated calls.

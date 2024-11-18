import express, { Request, Response } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import fetch from "node-fetch";
import { PromptTemplate } from "@langchain/core/prompts";
import { OpenAI } from "@langchain/openai";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
dotenv.config();

type Workflow = {
  id: number;
  name: string;
  description: string;
  url: string;
  createdAt: string;
  modifiedAt: string;
};

const db = new Database("workflow.db");

db.prepare(
  `
    CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        url TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        modifiedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
`
).run();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const handleError = (res: Response, error: unknown, message: string) => {
  console.error(message, error);
  res.status(500).json({ error: message });
};

// ROUTES
// Get All Workflows
app.get("/workflows", (req, res) => {
  try {
    const workflows = db.prepare("SELECT * FROM workflows").all();
    res.json(workflows);
  } catch (error) {
    handleError(res, error, "Error fetching workflows");
  }
});

// Create a New Workflow (POST /workflows)
app.post("/workflows", (req, res) => {
  const { name, description, url } = req.body;

  if (!name || !description || !url) {
    res.status(400).json({ error: "Name, description, and URL are required." });
  }

  try {
    const statement = db.prepare(
      "INSERT INTO workflows (name, description, url) VALUES (?, ?, ?)"
    );
    const result = statement.run(name, description, url);
    res.json({ id: result.lastInsertRowid, name, description, url });
  } catch (error) {
    handleError(res, error, "Error creating workflow");
  }
});

// Get a Specific Workflow by ID (GET /workflows/:id)
app.get("/workflows/:id", (req, res) => {
  try {
    const { id } = req.params;
    const workflow = db.prepare("SELECT * FROM workflows WHERE id = ?").get(id);
    if (workflow) {
      res.json(workflow);
    } else {
      res.status(404).json({ error: "Workflow not found" });
    }
  } catch (error) {
    handleError(res, error, "Error fetching workflow");
  }
});

// Update a Workflow by ID
app.put(
  "/workflows/:id",
  (req: Request<{ id: string }, {}, Partial<Workflow>>, res: Response) => {
    const { id } = req.params;
    const { name, description, url } = req.body;

    try {
      // console.log("Request received to update workflow with ID:", id);
      // console.log("Request body:", req.body);

      const existingWorkflow = db
        .prepare("SELECT * FROM workflows WHERE id = ?")
        .get(id) as Workflow | undefined;

      if (!existingWorkflow) {
        // console.log("No workflow found with the provided ID:", id);
        res.status(404).json({ error: "Workflow not found." });
        return;
      }

      // console.log("Existing workflow found:", existingWorkflow);

      const statement = db.prepare(`
      UPDATE workflows
      SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        url = COALESCE(?, url),
        modifiedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

      statement.run(name || null, description || null, url || null, id);

      // console.log("Workflow updated successfully. Updated values:", {
      //   id,
      //   name: name || existingWorkflow.name,
      //   description: description || existingWorkflow.description,
      //   url: url || existingWorkflow.url,
      // });

      res.json({
        id,
        name: name || existingWorkflow.name,
        description: description || existingWorkflow.description,
        url: url || existingWorkflow.url,
      });
    } catch (error) {
      console.error("Error occurred while updating the workflow:", error);
      handleError(res, error, "Error updating workflow");
    }
  }
);

// Execute a Workflow by ID
app.post(
  "/workflows/:id/execute",
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { prompt, model = "gpt-4o-mini" } = req.body;
    // console.log("ID: ", id);
    // console.log("Prompt: ", prompt);
    // console.log("Model: ", model);
    // console.log("OpenAI API Key:", process.env.OPENAI_API_KEY);

    const template = `You are an AI assistant specialized in {task}. {userPrompt}\nContent:\n{content}`;

    const workflow = db
      .prepare("SELECT * FROM workflows WHERE id = ?")
      .get(id) as Workflow | undefined;

    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    try {
      // console.log(`Fetching content from ${workflow.url}`);
      const response = await fetch(workflow.url);

      if (!response.ok) {
        console.error(`Failed to fetch content. Status: ${response.status}`);
        res.status(500).json({ error: `Failed to fetch content from URL` });
        return;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const bodyText = $("body").text();

      if (!bodyText) {
        console.error("No content found in the body of the fetched HTML.");
        res.status(500).json({ error: "No content found at the URL" });
        return;
      }

      const content = bodyText.slice(0, 8000);
      // console.log("Fetched Content Length:", content.length);

      // console.log("Reached prompt template creation.");
      const promptTemplate = new PromptTemplate({
        template: template,
        inputVariables: ["task", "userPrompt", "content"],
      });
      // console.log("Template: ", template);

      // console.log("Creating LLM");
      const llm = new OpenAI({
        // Either replace this with the OpenAI API Key or create .env file
        apiKey: process.env.OPENAI_API_KEY,
        modelName: model,
      });

      // console.log("Creating Chain");
      const chain = promptTemplate.pipe(llm);

      // console.log("Running LLM Chain");
      const aiResult = await chain.invoke({
        task: workflow.description,
        userPrompt: prompt,
        content: content,
      });

      // console.log("Results: ", aiResult);

      res.json({ result: aiResult });
    } catch (error) {
      handleError(res, error, "Error executing the workflow");
    }
  }
);

// Delete a Workflow
app.delete("/workflows/:id", (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare("DELETE FROM workflows WHERE id = ?").run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Workflow not found" });
    } else {
      res.json({ message: "Workflow deleted successfully" });
    }
  } catch (error) {
    handleError(res, error, "Error deleting workflow");
  }
});

// // New route to suggest a workflow
// app.post("/suggestWorkflow", async (req: Request, res: Response) => {
//   const { description } = req.body;

//   if (!description) {
//     res.status(400).json({ error: "Description is required for suggestion." });
//     return;
//   }

//   try {
//     // Use OpenAI to suggest a workflow
//     const template = `You are a workflow automation expert. Based on the following description, suggest a workflow.
// Please provide the suggestion in the following format:
// Name: <workflow_name>
// Description: <workflow_description>
// URL: <workflow_url>

// Description: {description}
// Suggested Workflow:
// `;

//     const promptTemplate = new PromptTemplate({
//       template,
//       inputVariables: ["description"],
//     });

//     const llm = new OpenAI({
//       apiKey: process.env.OPENAI_API_KEY,
//       modelName: "gpt-4",
//     });

//     const chain = promptTemplate.pipe(llm);
//     const aiSuggestion = await chain.invoke({ description });

//     // Manually parse the AI response text
//     const aiText = aiSuggestion as string;

//     // Regular expression to extract the information from the text
//     const nameMatch = aiText.match(/Name:\s*(.*)/);
//     const descriptionMatch = aiText.match(/Description:\s*(.*)/);
//     const urlMatch = aiText.match(/URL:\s*(.*)/);

//     const name = nameMatch ? nameMatch[1] : "Suggested Workflow";
//     const workflowDescription = descriptionMatch
//       ? descriptionMatch[1]
//       : description;
//     const url = urlMatch ? urlMatch[1] : "https://example.com";

//     res.json({
//       name,
//       description: workflowDescription,
//       url,
//     });
//   } catch (error) {
//     console.error("Error suggesting workflow:", error);
//     res.status(500).json({ error: "Failed to generate workflow suggestion." });
//   }
// });

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});

// Root route
app.get("/", (req, res) => {
  res.send(
    "Welcome to the Workflow Management API. Use /workflows to interact with workflows."
  );
});

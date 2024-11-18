import { useEffect, useState } from "react";
import "./App.css";

type Workflow = {
  id: number;
  name: string;
  description: string;
  url: string;
  createdAt: string;
  modifiedAt: string;
};

function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    url: "",
  });
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [prompt, setPrompt] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchWorkflows = () => {
    fetch("http://localhost:3000/workflows")
      .then((response) => response.json())
      .then((data) => setWorkflows(data))
      .catch((error) => console.error("Error fetching workflows:", error));
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleCreateOrUpdateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    // Check if all fields are empty
    if (!newWorkflow.name && !newWorkflow.description && !newWorkflow.url) {
      alert("Please fill in at least one field before suggesting a workflow.");
      return;
    }

    if (selectedWorkflow) {
      // Update workflow
      fetch(`http://localhost:3000/workflows/${selectedWorkflow.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newWorkflow.name || undefined,
          description: newWorkflow.description || undefined,
          url: newWorkflow.url || undefined,
        }),
      })
        .then((response) => response.json())
        .then(() => {
          setNewWorkflow({ name: "", description: "", url: "" });
          setSelectedWorkflow(null);
          fetchWorkflows();
        })
        .catch((error) => console.error("Error updating workflow:", error));
    } else {
      // Create new workflow
      fetch("http://localhost:3000/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newWorkflow),
      })
        .then((response) => response.json())
        .then(() => {
          setNewWorkflow({ name: "", description: "", url: "" });
          fetchWorkflows();
        })
        .catch((error) => console.error("Error creating workflow:", error));
    }
  };

  const handleExecuteWorkflow = (id: number) => {
    // Execute workflow
    setLoading(true);
    fetch(`http://localhost:3000/workflows/${id}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, model }),
    })
      .then((response) => response.json())
      .then((result) => {
        setExecutionResult(result.result);
        setPrompt("");
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error executing workflow:", error);
        setLoading(false);
      });
  };

  const handleDeleteWorkflow = (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this workflow?"
    );
    if (confirmDelete) {
      fetch(`http://localhost:3000/workflows/${id}`, { method: "DELETE" })
        .then(() =>
          setWorkflows(workflows.filter((workflow) => workflow.id !== id))
        )
        .catch((error) => console.error("Error deleting workflow:", error));
    }
  };

  // INCOMPLETE
  // const suggestWorkflow = (input: string) => {
  //   // Check if all fields (name, description, url) are empty
  //   if (!newWorkflow.name && !newWorkflow.description && !newWorkflow.url) {
  //     alert("Please fill in at least one field before suggesting a workflow.");
  //     return;
  //   }

  //   fetch(`http://localhost:3000/suggestWorkflow`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({ description: input }),
  //   })
  //     .then((response) => response.json())
  //     .then((suggestion) => {
  //       setNewWorkflow({
  //         name: suggestion.name,
  //         description: suggestion.description,
  //         url: suggestion.url,
  //       });
  //     })
  //     .catch((error) =>
  //       console.error("Error fetching workflow suggestions:", error)
  //     );
  // };

  const filteredWorkflows = workflows.filter((workflow) => {
    const search = searchTerm.toLowerCase();
    return (
      workflow.name.toLowerCase().includes(search) ||
      workflow.description.toLowerCase().includes(search)
    );
  });

  return (
    <div className="App">
      <h1>Workflow LLM Automation</h1>

      {/* Form to create a new workflow */}
      <form onSubmit={handleCreateOrUpdateWorkflow}>
        <h2>{selectedWorkflow ? "Edit Workflow" : "Create New Workflow"}</h2>
        <div className="input-row">
          <input
            type="text"
            placeholder={selectedWorkflow ? selectedWorkflow.name : "Name"}
            value={newWorkflow.name}
            onChange={(e) =>
              setNewWorkflow({ ...newWorkflow, name: e.target.value })
            }
          />
          <input
            type="text"
            placeholder={
              selectedWorkflow
                ? selectedWorkflow.description
                : "What the Workflow Should Do"
            }
            value={newWorkflow.description}
            onChange={(e) =>
              setNewWorkflow({ ...newWorkflow, description: e.target.value })
            }
          />
          <input
            type="text"
            placeholder={selectedWorkflow ? selectedWorkflow.url : "URL"}
            value={newWorkflow.url}
            onChange={(e) =>
              setNewWorkflow({ ...newWorkflow, url: e.target.value })
            }
          />
        </div>

        {/* Button container for better separation */}
        <div className="button-container">
          <button type="submit" disabled={loading}>
            {selectedWorkflow ? "Update Workflow" : "Create Workflow"}
          </button>

          {selectedWorkflow && (
            <button
              type="button"
              onClick={() => {
                setSelectedWorkflow(null);
                setNewWorkflow({ name: "", description: "", url: "" });
              }}
              disabled={loading}
            >
              Cancel Edit or Execute
            </button>
          )}

          {/* <button
            type="button"
            onClick={() => suggestWorkflow(newWorkflow.description)}
            disabled={loading}
          >
            Suggest Workflow with AI
          </button> */}
        </div>
      </form>

      {/* Search input for filtering workflows */}
      <input
        type="text"
        placeholder="Search Workflows by Name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      {/* Prompt input and workflow execution */}
      {selectedWorkflow && (
        <div className="execute-workflow">
          <h2>
            Execute Workflow {selectedWorkflow.id}: {selectedWorkflow.name}
          </h2>
          <input
            type="text"
            placeholder="Enter your prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />

          {/* Model selection */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loading}
          >
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4-0613">GPT-4 0613</option>
          </select>

          <button
            onClick={() => handleExecuteWorkflow(selectedWorkflow.id)}
            disabled={loading}
          >
            Run Prompt
          </button>
        </div>
      )}

      <h2>Available Workflows</h2>

      <div className="workflow-container">
        {/* Display filtered workflows */}
        <ul>
          {filteredWorkflows.map((workflow) => (
            <li className="workflow-item" key={workflow.id}>
              <div className="workflow-item-details">
                <h3>{workflow.name}</h3>
                <p>{workflow.description}</p>
                <p>{workflow.url}</p>
              </div>
              <div className="workflow-item-buttons">
                <button
                  onClick={() => setSelectedWorkflow(workflow)}
                  disabled={loading}
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedWorkflow(workflow)}
                  disabled={loading}
                >
                  Execute
                </button>
                <button
                  onClick={() => handleDeleteWorkflow(workflow.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Textbox for execution result */}
        <div className="execution-result">
          {executionResult && (
            <div>
              <h3>Execution Result:</h3>
              <textarea
                value={executionResult}
                readOnly
                rows={10}
                cols={50}
              ></textarea>
            </div>
          )}

          {/* Show loading spinner */}
          {loading && (
            <div>
              <h3>Loading...</h3>
              <div className="spinner"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

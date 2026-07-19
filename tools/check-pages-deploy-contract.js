const fs = require("fs");
const path = require("path");

const workflowPath = path.resolve(__dirname, "..", ".github", "workflows", "deploy-pages.yml");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

assert(fs.existsSync(workflowPath), "Missing GitHub Pages deployment workflow");

const workflow = fs.readFileSync(workflowPath, "utf8");
assert(workflow.includes("actions/configure-pages@"), "Workflow should configure GitHub Pages");
assert(workflow.includes("actions/upload-pages-artifact@v5"), "Workflow should use the Node 24-compatible Pages artifact action");
assert(workflow.includes("path: ./site"), "Workflow should deploy the site directory, not the repository root");
assert(workflow.includes("actions/deploy-pages@"), "Workflow should deploy the Pages artifact");

console.log("Pages deployment contract check passed.");

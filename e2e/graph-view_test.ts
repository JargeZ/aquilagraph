export {};
Feature("pwa-graph-view");

const path = require("node:path");
const { readDirAsVfs, initScriptForVirtualDirectoryPicker } = require("./vfs-helper");

Scenario("pwa: analyze test project, render graph, and validate navigation", async ({ I }) => {
	const testProjectRoot = path.resolve(
		__dirname,
		"../test_python_project/src",
	);
	const vfs = readDirAsVfs(testProjectRoot, "test_python_project_src");

	I.usePlaywrightTo("inject virtual directory picker", async ({ page }: any) => {
		await page.addInitScript(initScriptForVirtualDirectoryPicker(vfs));
	});

	I.amOnPage("/");
	I.waitForText("Новый проект", 10);
	I.click('[aria-label="Язык интерфейса"]');
	I.click('English');
	I.click("New project");

	// Go to Settings from the empty project graph page
	I.waitForText("No folder", 10);
	I.click("Open settings");

	// Apply Django template in analysis settings
	I.waitForText("Analysis settings", 10);
	I.click(locate("button").withText('Django'));

	// Select virtual directory (File System Access API mocked)
	I.click("Choose folder");
	I.waitForText("test_python_project_src", 10);

	// Run analysis and navigate to graph view
	I.click("Analyze");

	// Wait until SVG graph is rendered
	I.waitForText("ViewSet", 30);
	I.saveScreenshot("graph-rendered.png", true);

	I.doubleClick("//*[local-name()='text'][contains(., 'PerformExport')]");
	I.waitForText("Debug", 10);
	I.saveScreenshot("subgraph-rendered.png", true);
	I.pressKey("Escape")

	I.doubleClick("//*[local-name()='text'][contains(., 'PerformExport')]");
	I.waitForText("Debug", 10);
	I.click("Debug");
	I.waitForText("Decorators", 10);
	I.click('[aria-label="Add reference to classification"]');
	I.selectOption("Select", "Business")
	I.click("Add");
	I.click("Back");
	I.click("Back");
	I.click("Settings");
	I.waitForText("Analysis settings")
	I.waitForText("export_module.actions.perform_export.PerformExport")

});

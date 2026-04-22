export {};
Feature("large-connections-graph-view");

const path = require("node:path");
const { readDirAsVfs, initScriptForVirtualDirectoryPicker } = require("./vfs-helper");

Scenario("pwa: analyze large-connections project and capture graph screenshot", async ({ I }) => {
	const testProjectRoot = path.resolve(
		__dirname,
		"../test_python_project/src_large_connections",
	);
	const vfs = readDirAsVfs(testProjectRoot, "src_large_connections");

	I.usePlaywrightTo("inject virtual directory picker", async ({ page }: any) => {
		await page.addInitScript(initScriptForVirtualDirectoryPicker(vfs));
	});

	I.amOnPage("/");
	I.waitForText("Новый проект", 10);
	I.click('[aria-label="Язык интерфейса"]');
	I.click('English');
	I.click("New project");

	I.waitForText("No folder", 10);
	I.click("Open settings");

	I.waitForText("Analysis settings", 10);
	I.click(locate("button").withText('Django'));

	I.click("Choose folder");
	I.waitForText("src_large_connections", 10);

	I.click("Analyze");

	// Composite layout: wait for any node group to appear (two-pass dot+neato)
	I.waitForElement("svg g.node", 60);
	I.saveScreenshot("large-connections-graph.png", true);
});

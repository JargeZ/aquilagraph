/**
 * Builds unique dot-notation references from file paths and scope names.
 *
 * Example: filePath="export_module/actions/perform_export.py", scopeName="execute", parentName="PerformExport"
 * => "export_module.actions.perform_export.PerformExport.execute"
 */
export function buildReference(
  filePath: string,
  scopeName: string,
  parentName?: string,
): string {
  const moduleRef = filePathToModuleRef(filePath);
  const parts = [moduleRef];
  if (parentName) parts.push(parentName);
  parts.push(scopeName);
  return parts.join(".");
}

export function filePathToModuleRef(filePath: string): string {
  return filePath
    .replace(/\.py$/, "")
    .replace(/\//g, ".");
}

export function getModuleName(reference: string, depth: number): string {
  const parts = reference.split(".");
  return parts.slice(0, depth).join(".");
}

/**
 * Extracts parent class names from a Python class signature.
 * e.g. "class Foo(Bar, Baz)" => ["Bar", "Baz"]
 * e.g. "class Foo(viewsets.ModelViewSet)" => ["viewsets.ModelViewSet"]
 */
export function extractParentClasses(signature: string): string[] {
  const match = signature.match(/^class\s+\w+\s*\(([^)]+)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

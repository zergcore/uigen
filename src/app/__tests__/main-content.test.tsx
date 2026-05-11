import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainContent } from "@/app/main-content";

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("shows preview frame by default", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("file-tree")).toBeNull();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("Preview tab is active by default", () => {
  render(<MainContent />);
  const previewTab = screen.getByRole("tab", { name: /preview/i });
  expect(previewTab.getAttribute("data-state")).toBe("active");
});

test("Code tab is inactive by default", () => {
  render(<MainContent />);
  const codeTab = screen.getByRole("tab", { name: /code/i });
  expect(codeTab.getAttribute("data-state")).toBe("inactive");
});

test("clicking Code tab shows code editor and file tree", () => {
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: /code/i });
  fireEvent.click(codeTab);

  expect(screen.queryByTestId("preview-frame")).toBeNull();
  expect(screen.getByTestId("file-tree")).toBeDefined();
  expect(screen.getByTestId("code-editor")).toBeDefined();
});

test("Code tab becomes active after clicking", () => {
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: /code/i });
  fireEvent.click(codeTab);

  expect(codeTab.getAttribute("data-state")).toBe("active");
});

test("Preview tab becomes inactive after clicking Code", () => {
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: /code/i });
  fireEvent.click(codeTab);

  const previewTab = screen.getByRole("tab", { name: /preview/i });
  expect(previewTab.getAttribute("data-state")).toBe("inactive");
});

test("clicking Preview tab after Code shows preview frame", () => {
  render(<MainContent />);

  fireEvent.click(screen.getByRole("tab", { name: /code/i }));
  fireEvent.click(screen.getByRole("tab", { name: /preview/i }));

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("file-tree")).toBeNull();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

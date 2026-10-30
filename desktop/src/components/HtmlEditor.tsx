import { AlertCircle, MousePointer2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { HtmlEditorState } from "../useHtmlEditor";

export function EditorError({ message }: { message: string }) {
  return message ? (
    <Alert variant="destructive" className="editor-error">
      <AlertCircle />
      <AlertTitle>文字尚未保存</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}
export function HtmlEditor({ editor }: { editor: HtmlEditorState }) {
  const d = editor.draft;
  if (!d) return null;
  return (
    <>
      <div className="text-edit-toolbar" role="status">
        <MousePointer2 aria-hidden="true" />
        <span>点击页面上的文字，即可修改</span>
        <Button
          variant="outline"
          size="sm"
          disabled={editor.busy}
          onClick={() => void editor.run(() => {})}
        >
          完成编辑
        </Button>
      </div>
      <EditorError message={d.selection ? "" : editor.error} />
      <Sheet
        open={(!!d.selection || !!d.options?.length) && !editor.confirming}
        onOpenChange={(open) => {
          if (!open) editor.closeSelection();
        }}
      >
        <SheetContent
          side="bottom"
          className="text-edit-sheet"
          showCloseButton={false}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            editor.closeSelection();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
        >
          <SheetHeader>
            <div className="text-edit-heading">
              <SheetTitle>
                {d.selection
                  ? `修改${d.selection.target.label}`
                  : "选择要修改的文字"}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="关闭文字编辑"
                disabled={editor.busy}
                onClick={editor.closeSelection}
              >
                <X />
              </Button>
            </div>
            <SheetDescription>
              {d.name} · 保存后直接更新本地原文件
            </SheetDescription>
          </SheetHeader>
          <div className="text-edit-form">
            <EditorError message={editor.error} />
            {d.selection ? (
              <>
                <Field>
                  <FieldLabel htmlFor="selected-text">文字内容</FieldLabel>
                  <Textarea
                    id="selected-text"
                    autoFocus
                    value={d.selection?.text ?? ""}
                    disabled={editor.busy}
                    onChange={(e) => editor.change(e.target.value)}
                    className="text-edit-input"
                  />
                  <FieldDescription>
                    保留当前文字的样式。加粗、链接等不同样式的文字可分别点击修改。
                  </FieldDescription>
                </Field>
                <div className="text-edit-footer">
                  <span role="status">
                    {editor.busy
                      ? "正在保存…"
                      : editor.dirty
                        ? "有未保存的修改"
                        : "修改后可保存"}
                  </span>
                  <Button
                    variant="outline"
                    disabled={editor.busy}
                    onClick={editor.closeSelection}
                  >
                    取消
                  </Button>
                  <Button
                    disabled={editor.busy || !editor.dirty}
                    onClick={() => void editor.save()}
                  >
                    <Save data-icon="inline-start" />
                    {editor.busy ? "正在保存…" : "保存到原文件"}
                  </Button>
                </div>
              </>
            ) : (
              <div
                className="text-fragment-options"
                aria-label="可修改的文字片段"
              >
                <p>此处有多段不同样式的文字，请选择一段。</p>
                {d.options?.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    onClick={() => editor.select(t.id, t.text)}
                  >
                    {t.text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
export function UnsavedDialog({ editor }: { editor: HtmlEditorState }) {
  return (
    <Dialog
      open={editor.confirming}
      onOpenChange={(open) => {
        if (!open) editor.cancel();
      }}
    >
      <DialogContent showCloseButton={!editor.busy}>
        <DialogHeader>
          <DialogTitle>保存这处文字的修改？</DialogTitle>
          <DialogDescription>
            “{editor.draft?.name}”的文字尚未保存。
          </DialogDescription>
        </DialogHeader>
        <EditorError message={editor.error} />
        <DialogFooter>
          <Button
            variant="outline"
            disabled={editor.busy}
            onClick={editor.cancel}
          >
            继续修改
          </Button>
          <Button
            variant="outline"
            disabled={editor.busy}
            onClick={() => void editor.resolve(false)}
          >
            放弃修改
          </Button>
          <Button
            disabled={editor.busy}
            onClick={() => void editor.resolve(true)}
          >
            {editor.busy ? "正在保存…" : "保存到原文件"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

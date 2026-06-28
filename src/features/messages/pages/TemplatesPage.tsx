import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pencil, Mail, MessageSquare, Loader2, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Template {
  id: string; facility_id: string | null; code: string; channel: string;
  name: string; subject: string | null; body: string; status: string; version: number;
}

export default function TemplatesPage() {
  return (
    <RoleGuard roles={["owner", "manager"]}>
      <TemplatesContent />
    </RoleGuard>
  );
}

function TemplatesContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const fid = facility?.id;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["message-templates", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase.from("message_templates")
        .select("*")
        .or(`facility_id.eq.${fid},facility_id.is.null`)
        .eq("status", "active")
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Group by code, preferring facility-specific over global
  const grouped = templates.reduce((acc, t) => {
    const key = `${t.code}-${t.channel}`;
    if (!acc[key] || t.facility_id) acc[key] = t;
    return acc;
  }, {} as Record<string, Template>);
  const displayTemplates = Object.values(grouped);

  const saveMutation = useMutation({
    mutationFn: async (tpl: { id?: string; code: string; channel: string; name: string; subject: string; body: string }) => {
      const { error } = await supabase.from("message_templates").upsert({
        id: tpl.id ?? undefined, facility_id: fid!, code: tpl.code, channel: tpl.channel,
        name: tpl.name, subject: tpl.subject || null, body: tpl.body, status: "active",
        version: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["message-templates", fid] });
      toast.success("Template saved.");
      setEditing(null);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/app/${slug}/messages`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-semibold tracking-tight">Message Templates</h1>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (
        <div className="space-y-2">
          {displayTemplates.map((t) => (
            <Card key={`${t.code}-${t.channel}`} className="flex items-center gap-3 rounded-xl p-4">
              {t.channel === "email" ? <Mail className="h-4 w-4 text-muted-foreground" /> : <MessageSquare className="h-4 w-4 text-emerald-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.code} · {t.channel} · {t.facility_id ? "Custom" : "Default"}</p>
              </div>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => setEditing(t)}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor template={editing} onSave={(t) => saveMutation.mutate(t)} saving={saveMutation.isPending} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, saving, onClose }: {
  template: Template; onSave: (t: { id?: string; code: string; channel: string; name: string; subject: string; body: string }) => void;
  saving: boolean; onClose: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
          <h2 className="text-base font-semibold">Edit: {template.name}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          {template.channel === "email" && (
            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          )}
          <div className="space-y-2">
            <Label>Body (Markdown with {"{{variables}}"} )</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-mono text-sm" />
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Available variables:</p>
            <p className="text-[11px] text-muted-foreground">
              {"{{guest.first_name}} {{guest.full_name}} {{facility.name}} {{facility.address}} {{reservation.reference}} {{reservation.check_in}} {{reservation.check_out}} {{reservation.nights}} {{reservation.room_type}} {{reservation.total}} {{links.manage_booking}} {{links.unsubscribe}}"}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={saving} className="gap-2" onClick={() => onSave({
              id: template.facility_id ? template.id : undefined,
              code: template.code, channel: template.channel, name, subject, body,
            })}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

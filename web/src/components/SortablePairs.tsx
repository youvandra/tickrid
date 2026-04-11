"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";

function SortableRow(props: { id: string; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm",
        isDragging ? "opacity-70" : ""
      ].join(" ")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex-1 cursor-grab text-left active:cursor-grabbing"
      >
        {props.id}
      </button>
      <button
        type="button"
        onClick={() => props.onRemove(props.id)}
        className="ml-2 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
      >
        Remove
      </button>
    </div>
  );
}

export function SortablePairs(props: {
  pairs: string[];
  onChange: (next: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(evt) => {
        const { active, over } = evt;
        if (!over || active.id === over.id) return;
        const oldIndex = props.pairs.indexOf(String(active.id));
        const newIndex = props.pairs.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        props.onChange(arrayMove(props.pairs, oldIndex, newIndex));
      }}
    >
      <SortableContext items={props.pairs} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {props.pairs.map((p) => (
            <SortableRow
              key={p}
              id={p}
              onRemove={(id) => props.onChange(props.pairs.filter((x) => x !== id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

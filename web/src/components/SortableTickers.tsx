"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";

export type TickerItem = {
  id: string;
  type: string;
  symbol: string;
  interval: string;
  exchange?: string;
};

function SortableRow(props: { item: TickerItem; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id
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
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
            {props.item.type}
          </span>
          <span className="text-white/90">{props.item.symbol}</span>
          <span className="text-white/40">{props.item.interval}</span>
          {props.item.exchange ? <span className="text-white/40">@{props.item.exchange}</span> : null}
        </div>
      </button>
      <button
        type="button"
        onClick={() => props.onRemove(props.item.id)}
        className="ml-2 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
      >
        Remove
      </button>
    </div>
  );
}

export function SortableTickers(props: {
  items: TickerItem[];
  onChange: (next: TickerItem[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(evt) => {
        const { active, over } = evt;
        if (!over || active.id === over.id) return;
        const oldIndex = props.items.findIndex((x) => x.id === String(active.id));
        const newIndex = props.items.findIndex((x) => x.id === String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        props.onChange(arrayMove(props.items, oldIndex, newIndex));
      }}
    >
      <SortableContext items={props.items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {props.items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              onRemove={(id) => props.onChange(props.items.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

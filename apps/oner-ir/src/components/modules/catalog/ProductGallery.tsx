"use client";
import Image from "next/image";
import { useState } from "react";
import { mediaUrl } from "@core/services/api/shop.api";
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const available = images.filter(Boolean); const [selected, setSelected] = useState(available[0] ?? "");
  return <div className="gallery"><div className="main-photo"><Image src={mediaUrl(selected)} alt={name} fill priority sizes="(max-width:800px) 100vw, 52vw"/></div>{available.length > 1 ? <div className="thumbs">{available.map((image, index) => <button type="button" key={`${image}-${index}`} className={selected === image ? "active" : ""} onClick={() => setSelected(image)} aria-label={`تصویر ${index + 1} از ${name}`}><Image src={mediaUrl(image)} alt="" fill sizes="90px"/></button>)}</div> : null}</div>;
}

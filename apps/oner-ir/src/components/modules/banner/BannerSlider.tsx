"use client";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { mediaUrl } from "@core/services/api/shop.api";
import type { StoreBanner } from "@core/types/shop.types";
export function BannerSlider({ banners }: { banners: StoreBanner[] }) {
  const [index, setIndex] = useState(0); useEffect(() => { if (banners.length < 2) return; const timer = setInterval(() => setIndex((value) => (value + 1) % banners.length), 6000); return () => clearInterval(timer) }, [banners.length]);
  if (!banners.length) return null; const banner = banners[index];
  return <section className="banner-slider"><div className="banner-visual"><Image src={mediaUrl(banner.image)} alt={banner.title} fill priority sizes="100vw"/><div className="banner-copy"><span>{banner.subtitle}</span><h2>{banner.title}</h2></div></div>{banners.length > 1 ? <><button className="banner-prev" onClick={() => setIndex((index - 1 + banners.length) % banners.length)} aria-label="بنر قبلی"><ChevronRight/></button><button className="banner-next" onClick={() => setIndex((index + 1) % banners.length)} aria-label="بنر بعدی"><ChevronLeft/></button><div className="banner-dots">{banners.map((item, dot) => <button key={item._id} className={dot === index ? "active" : ""} onClick={() => setIndex(dot)} aria-label={`بنر ${dot + 1}`}/>)}</div></> : null}</section>
}

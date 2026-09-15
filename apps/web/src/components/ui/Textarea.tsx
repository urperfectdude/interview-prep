import { TextareaHTMLAttributes, forwardRef } from "react";
import { fieldClass } from "./Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`${fieldClass} min-h-20 px-3 py-2 leading-relaxed ${className}`} {...props} />;
  }
);

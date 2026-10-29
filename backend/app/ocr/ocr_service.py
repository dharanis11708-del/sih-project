import os
import re
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
import pymupdf as fitz
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

class OCRService:
    """
    Intelligent OCR & Document Extraction Pipeline.
    Extracts text from PDF/Images and parses dates, lease tenures, and reference numbers.
    """

    DATE_PATTERNS = [
        r'\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b',
        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4})\b',
        r'\b(?:Valid\s*(?:thru|through|until|up\s*to)?[:\s]*)(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b',
        r'\b(?:Expiry\s*Date[:\s]*)(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b',
        r'\b(?:Date\s*of\s*Issue[:\s]*)(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b',
    ]

    LEASE_PATTERNS = [
        r'\b(?:period\s*of|lease\s*for|term\s*of)?\s*(\d{1,2})\s*(?:years|yrs)\b',
        r'\b(\d{1,2})\s*years\s*lease\b',
    ]

    NOC_PATTERNS = [
        r'\b(?:NOC|Ref|Letter|No|Reg)\.?\s*[:#-]?\s*([A-Z0-9/\-_]{6,25})\b',
    ]

    @classmethod
    def extract_text_from_file(cls, file_path: str) -> Tuple[str, float]:
        """Extracts text using PyMuPDF (fast & lossless for native PDFs) with Tesseract OCR fallback."""
        if not os.path.exists(file_path):
            return "", 0.0

        ext = os.path.splitext(file_path)[1].lower()
        extracted_text = ""
        confidence = 0.85

        if ext == ".pdf":
            try:
                doc = fitz.open(file_path)
                for page_num in range(min(len(doc), 5)): # scan up to first 5 pages
                    page = doc[page_num]
                    page_text = page.get_text()
                    if page_text.strip():
                        extracted_text += page_text + "\n"
                    elif pytesseract:
                        # Scanned image inside PDF: render page to pixmap and run pytesseract
                        pix = page.get_pixmap(dpi=150)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        try:
                            ocr_result = pytesseract.image_to_string(img)
                            extracted_text += ocr_result + "\n"
                            confidence = 0.75
                        except Exception:
                            pass
                doc.close()
            except Exception as e:
                extracted_text = f"Error reading PDF: {str(e)}"
                confidence = 0.1
        elif ext in [".jpg", ".jpeg", ".png"]:
            if pytesseract:
                try:
                    img = Image.open(file_path)
                    extracted_text = pytesseract.image_to_string(img)
                    confidence = 0.80
                except Exception as e:
                    extracted_text = f"OCR failed: {str(e)}"
                    confidence = 0.2
            else:
                extracted_text = "Image uploaded (Tesseract OCR not configured)"
                confidence = 0.5

        return extracted_text.strip(), confidence

    @classmethod
    def parse_fields(cls, text: str) -> Dict[str, Any]:
        """Parses dates, lease duration, and reference IDs from document text."""
        fields: Dict[str, Any] = {
            "dates_found": [],
            "issue_date": None,
            "expiry_date": None,
            "lease_years": None,
            "reference_number": None,
        }

        # 1. Extract dates
        found_dates = []
        for pattern in cls.DATE_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for m in matches:
                if m not in found_dates:
                    found_dates.append(m)
        fields["dates_found"] = found_dates[:5]

        # Heuristic: Assign first date as issue_date, later date as expiry_date if multiple found
        parsed_datetimes = []
        for d_str in found_dates:
            dt = cls._parse_date_string(d_str)
            if dt:
                parsed_datetimes.append(dt)

        if parsed_datetimes:
            parsed_datetimes.sort()
            fields["issue_date"] = parsed_datetimes[0].isoformat()
            if len(parsed_datetimes) > 1:
                fields["expiry_date"] = parsed_datetimes[-1].isoformat()

        # 2. Extract lease years
        for pattern in cls.LEASE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    fields["lease_years"] = int(match.group(1))
                    break
                except ValueError:
                    pass

        # 3. Extract reference numbers
        for pattern in cls.NOC_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields["reference_number"] = match.group(1)
                break

        return fields

    @staticmethod
    def _parse_date_string(date_str: str) -> Optional[datetime]:
        """Attempts to parse common date formats into a datetime object."""
        date_str = date_str.strip()
        formats = [
            "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y",
            "%Y-%m-%d", "%Y/%m/%d",
            "%d-%m-%y", "%d/%m/%y",
            "%d %b %Y", "%d %B %Y",
            "%d %b, %Y", "%d %B, %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

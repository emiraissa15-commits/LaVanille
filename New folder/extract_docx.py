import xml.etree.ElementTree as ET
import os

def extract_text_from_xml(xml_path):
    if not os.path.exists(xml_path):
        return "File not found"
    
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    # Namespaces used in Word document.xml
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    }
    
    text_content = []
    for paragraph in root.findall('.//w:p', namespaces):
        paragraph_text = []
        for run in paragraph.findall('.//w:r', namespaces):
            for text in run.findall('.//w:t', namespaces):
                if text.text:
                    paragraph_text.append(text.text)
        if paragraph_text:
            text_content.append("".join(paragraph_text))
    
    return "\n".join(text_content)

if __name__ == "__main__":
    xml_file = "temp_docx/word/document.xml"
    content = extract_text_from_xml(xml_file)
    with open("cahier_des_charges.txt", "w", encoding="utf-8") as f:
        f.write(content)
    print("Extraction complete. Text saved to cahier_des_charges.txt")

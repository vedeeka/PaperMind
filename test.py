import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter

doc = fitz.open("deepresearch/papers/paper1.pdf")

text = ""
for page in doc:
    text += page.get_text()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200
)

chunks = splitter.split_text(text)

print("Total chunks:", len(chunks))
print(chunks[1])
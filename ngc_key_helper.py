import os
from cryptography.fernet import Fernet

# File paths
ENCRYPTION_KEY_FILE = "ngc_key_encryption.key"
ENCRYPTED_KEY_FILE = "ngc_api_key.enc"

# Generate or load encryption key
def get_cipher():
    if not os.path.exists(ENCRYPTION_KEY_FILE):
        key = Fernet.generate_key()
        with open(ENCRYPTION_KEY_FILE, "wb") as key_file:
            key_file.write(key)
    else:
        with open(ENCRYPTION_KEY_FILE, "rb") as key_file:
            key = key_file.read()
    return Fernet(key)

# Save the NGC API key
def save_key(key: str):
    cipher = get_cipher()
    encrypted_key = cipher.encrypt(key.encode())
    with open(ENCRYPTED_KEY_FILE, "wb") as enc_file:
        enc_file.write(encrypted_key)

# Retrieve the NGC API key
def retrieve_key() -> str | None:
    if not os.path.exists(ENCRYPTED_KEY_FILE):
        return None
    cipher = get_cipher()
    with open(ENCRYPTED_KEY_FILE, "rb") as enc_file:
        encrypted_key = enc_file.read()
    return cipher.decrypt(encrypted_key).decode()

# Delete the NGC API key
def delete_key():
    if os.path.exists(ENCRYPTED_KEY_FILE):
        os.remove(ENCRYPTED_KEY_FILE)

# Check if a key exists
def key_exists() -> bool:
    return os.path.exists(ENCRYPTED_KEY_FILE)


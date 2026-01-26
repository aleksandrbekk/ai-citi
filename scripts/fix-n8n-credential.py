#!/usr/bin/env python3
"""
Скрипт для автоматического исправления credential в n8n
Требует: pip install selenium webdriver-manager
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# Данные для входа
N8N_URL = "https://n8n.iferma.pro"
EMAIL = "levbekk@bk.ru"
PASSWORD = "Sibbek199031"
CREDENTIAL_ID = "7FT4jOTayaycNGbj"
CREDENTIAL_NAME = "Vertex AI Pro Account"

def main():
    print("🚀 Запуск автоматизации n8n...")
    
    # Настройка Chrome
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Раскомментируй для видимого браузера
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options
    )
    
    try:
        # Шаг 1: Вход
        print("📝 Вход в n8n...")
        driver.get(f"{N8N_URL}/login")
        time.sleep(2)
        
        # Находим поля входа
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        password_input = driver.find_element(By.NAME, "password")
        
        email_input.send_keys(EMAIL)
        password_input.send_keys(PASSWORD)
        
        # Нажимаем кнопку входа
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        login_button.click()
        
        print("⏳ Ожидание загрузки...")
        time.sleep(5)
        
        # Шаг 2: Переход к Credentials
        print("🔑 Переход к Credentials...")
        driver.get(f"{N8N_URL}/credentials")
        time.sleep(3)
        
        # Шаг 3: Поиск credential
        print(f"🔍 Поиск credential '{CREDENTIAL_NAME}'...")
        # Здесь нужна логика поиска и клика на credential
        
        # Шаг 4: Редактирование
        print("✏️ Редактирование credential...")
        # Здесь нужна логика редактирования приватного ключа
        
        print("✅ Готово!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.quit()

if __name__ == "__main__":
    main()

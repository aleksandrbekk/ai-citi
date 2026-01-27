#!/usr/bin/env python3
"""
Скрипт для создания Data Store в Vertex AI Search (Discovery Engine API)
Использует Service Account для аутентификации
"""

import os
import json
import sys
from google.auth import default
from google.auth.transport.requests import Request
from google.oauth2 import service_account
import requests

PROJECT_ID = "gen-lang-client-0102901194"
LOCATION = "global"
COLLECTION_ID = "default_collection"

def get_access_token():
    """Получить access token из Service Account"""
    # Пытаемся получить из переменной окружения
    service_account_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT')
    
    if not service_account_json:
        print("❌ GOOGLE_SERVICE_ACCOUNT не найден в переменных окружения")
        print("💡 Убедитесь, что переменная установлена в Supabase Secrets")
        sys.exit(1)
    
    try:
        credentials_dict = json.loads(service_account_json)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        credentials.refresh(Request())
        return credentials.token
    except Exception as e:
        print(f"❌ Ошибка при получении токена: {e}")
        sys.exit(1)

def create_data_store(display_name: str, data_store_type: str = "GENERIC"):
    """Создать Data Store через Discovery Engine API"""
    
    token = get_access_token()
    
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION_ID}/dataStores"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Для unstructured данных
    data_store_config = {
        "displayName": display_name,
        "industryVertical": "GENERIC",
        "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
        "contentConfig": "CONTENT_REQUIRED",
        "createAdvancedSiteSearch": False
    }
    
    print(f"🔄 Создаю Data Store: {display_name}...")
    print(f"📍 Локация: {LOCATION}")
    print(f"📦 Тип: {data_store_type}")
    
    response = requests.post(url, headers=headers, json=data_store_config)
    
    if response.status_code == 200:
        data = response.json()
        data_store_id = data.get("name", "").split("/")[-1]
        print(f"✅ Data Store создан успешно!")
        print(f"🆔 Data Store ID: {data_store_id}")
        print(f"📋 Полное имя: {data.get('name', '')}")
        return data_store_id
    else:
        print(f"❌ Ошибка при создании Data Store:")
        print(f"   Код: {response.status_code}")
        print(f"   Ответ: {response.text}")
        return None

def list_data_stores():
    """Список существующих Data Stores"""
    token = get_access_token()
    
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION_ID}/dataStores"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        stores = data.get("dataStores", [])
        if stores:
            print(f"📋 Найдено Data Stores: {len(stores)}")
            for store in stores:
                store_id = store.get("name", "").split("/")[-1]
                print(f"   - {store.get('displayName', 'Без названия')} (ID: {store_id})")
        else:
            print("📋 Data Stores не найдены")
        return stores
    else:
        print(f"❌ Ошибка при получении списка: {response.status_code}")
        print(f"   Ответ: {response.text}")
        return []

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Создать Data Store в Vertex AI Search")
    parser.add_argument("--name", default="test-rag-store", help="Название Data Store")
    parser.add_argument("--list", action="store_true", help="Показать список существующих Data Stores")
    
    args = parser.parse_args()
    
    if args.list:
        list_data_stores()
    else:
        data_store_id = create_data_store(args.name)
        if data_store_id:
            print("\n✅ Готово! Теперь можно загружать документы через консоль:")
            print(f"   https://console.cloud.google.com/gen-app-builder/data-stores/{data_store_id}?project={PROJECT_ID}")

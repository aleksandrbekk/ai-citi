# 🔧 Инструкция по исправлению credential в n8n

## Быстрое решение (5 минут)

### Шаг 1: Открой n8n
Зайди на: https://n8n.iferma.pro/login

### Шаг 2: Войди
- Email: `levbekk@bk.ru`
- Password: `Sibbek199031`

### Шаг 3: Перейди в Credentials
Меню → Credentials (или прямой URL: https://n8n.iferma.pro/credentials)

### Шаг 4: Найди credential
Найди "Vertex AI Pro Account" и кликни на него

### Шаг 5: Скопируй правильный приватный ключ
Скопируй весь блок ниже (от BEGIN до END включительно):

```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDpYeKVdAHODumy
NTrrwOd064a7hEvK5GHXFdFCjl1DuLKHK4/HooFzedTl2o4qX2NM3/Y3cK2cjAPp
ljmw+COfBP7PczScaRpInm/RodNiP1CQFk6giNPKVyVt6pRaRYypWgsSxRIqg2w1
xzBz/t+RZRyrRgbqNaOcbmMlDWE/A4I5wbSxsMebsgaF/o+pSTOIueQC+3EHwmtf
GN7xuoy52KUKUHfJGvUvYX4fI7jGZVSSCn8N1Ph5YYssFlZGsdSIgZaeh219Egfz
yauH6BwqyYwx+GHtGyAn6xNdd6GYs2iOck3+SObrawQlN7z2/+OUrVcVZFHyBYCw
JFOhx223AgMBAAECggEAHeNcSjmOFZ6RTTJF9nVA7xdOrOsXbcdrxEjWAMkMpqSb
sHXitvVX0LsUic9Aj6qho/G2rYjvovHHen2zq7dLkIzqORUO8sz/AbfQqC8qTBXB
soI41ZRQU0Rv1bDKCPmJNxMCAghc+DbWf9ifmutUJGGnl0OjlREDgAAfEFqzTodc
18wl9TLiwxUSh1aT+m6pt3+7fdth9bKa9NEGsoLQkRKv1e1qKyS6sqUDx9rrBCtv
gzb9DhXkEqdGjSHJS6iAdk4bAx4IeyBrHOEn6nNk5HNCP11FsayK2CtTeNd91ou0
AjW0P79BSaOBiOxJsVvvGqHNNHv1zwukONHPEj210QKBgQD+2iWrffE3lJJZ0zhz
WuOSIzHOPK0u+6bZ0rCY7p+huuLJIBm0dGzQbBML7sBY3Nqzw+eQQ+45qXN0GKs8
d0PiNjJb7lP8fvQR+25SX+8t8D2AxWFxLreoWQnDf1IAKheBKx/ZKSR+7awsnLF4
yYpgsd/x4mXODOdPHAY90F2cGQKBgQDqbvuLQBswzYLgsOj22ZY3CFXhM89wGi6k
gfIgBXAq5nW5fYdv1LLYf1uMfEE/TaodkUU9JSIgjaOwwtKkB649g41hwQlUtnjJ
jPuj9UTuHIdjGOhojj/yxNcDbPTmFw2JM6BX7w2e1hmElhpk0zdVue7cTJxKhXN/
nj48vI6STwKBgE4yh254ZWRlfQZ8zgxvLfawP98FNSp+YvLhN/ik92w7mMyXweth
8eV909ZMes6Jbb3M9aeJgHZG7TsJOrmB6t1lPcyBc1m9ZoyB9pbmAtC4r1Zsufpt
mELalylaTsHoKHAk2E/c1OrxaGwD5FyokoIa8hkZG52+zdazRaL/5Uk5AoGAOUxa
6tQGUU1JmcVji0HvNxAwfVR+dPXRRKAGH9F0cufVCjsmKS0hcUzfgVy1TdWbqJJj
C+jRiIdV5NQZS8Ic0igfHC9kKnJW31w3/QDrkg8jABOMalGqS5nUu5+b08j6o/gc
TqG9AH9vyTouxUnikm9ZdDq9UHGBo0V4DLxBVH0CgYBX0zjbyiJB+bheNd3Aw65y
KA4igV/clyyO2NkPMLCTpQw2+RMj3fCW3Z1eSojMH4G1IgAZbsDlLaov4y7wTmcZ
awopS37qyuGXoz8wtXv6BBEUtrvZ9tEtDIOsdWIEIkdvmjTWIxyBxfzMG8rpYSgW
S7L0bJeMgOQyw1T2zncr4w==
-----END PRIVATE KEY-----
```

### Шаг 6: Вставь в поле privateKey
1. Найди поле "Private Key" или "privateKey" (обычно это большое textarea)
2. **Полностью очисти** старое значение (Ctrl+A, Delete)
3. Вставь скопированный ключ выше
4. Проверь, что поле "Email" содержит: `imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com`
5. Проверь, что поле "Region" содержит: `us-central1`

### Шаг 7: Сохрани
Нажми кнопку "Save" или "Update"

### Шаг 8: Протестируй
Отправь голосовое сообщение боту в Telegram - должно работать!

---

## ✅ Что уже исправлено в workflow:

- ✅ URL endpoint: `gemini-1.5-flash-001:generateContent` (правильный, не stream)
- ✅ JSON Body: `inlineData` (camelCase, правильный формат)
- ✅ MIME type: `audio/ogg` (для Telegram голосовых)
- ✅ Workflow активирован и готов к работе

**Осталось только исправить credential!**

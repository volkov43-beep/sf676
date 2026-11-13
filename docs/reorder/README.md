# СФ676 — подготовка к изменению порядка блоков

## Исходная точка части 1А

| Поле | Значение |
|---|---|
| Цель | Зафиксировать порядок блоков, связи интерактивных элементов и результаты доступных командных проверок до перестановки. |
| Дата | 13 ноября 2026 года |
| `main` | `f32b47d524c920760b12dfbd91ceef6a00c8d0b7` |
| `feature/sf676-reorder-quiz` до изменений документации | `f32b47d524c920760b12dfbd91ceef6a00c8d0b7` |
| Исходный коммит для аудита и проверок | `f32b47d524c920760b12dfbd91ceef6a00c8d0b7` — обе ветки указывали на этот коммит. |
| Статус при первом сохранении | Часть 1А начата; аудит и проверки ещё не завершены |
| Границы | Изменения только в `docs/reorder/`, без браузера и правок сайта. |

Первое сохранение — [`fccbb5a`](https://github.com/volkov43-beep/sf676/commit/fccbb5a1b35afc367b21f986d6795aff2245fbae). [Draft PR №24](https://github.com/volkov43-beep/sf676/pull/24) открыт до аудита и проверок. **Итог 1А — исходное состояние зафиксировано, результаты применимых командных проверок подтверждены.**

## Порядок блоков

В исходном [index.html](../../index.html) 13 основных секций и служебная секция в конце. Отдельный блок цены `#price` стоит 4-м, комплектация с мастером `#config` — 8-й, завод `#plant` — 11-м. Элемент с ID `reviews` отсутствует.

| № | Секция | Классы секции | Фон по CSS |
|---:|---|---|---|
| 1 | `#top` — первый экран | `hero v1` | Белая основа, тёмно-синяя область с фотографией |
| 2 | `#advantages` — преимущества | `grey v1` | Светло-серый |
| 3 | `#specs` — характеристики | `v1` | Белый |
| 4 | `#price` — цена и платежи | `grey v1 commercial` | Светло-серый |
| 5 | `#acceptance` — приёмка | `v1 trust-section` | Белый |
| 6 | `#design` — конструкция | `grey v1 trust-section` | Светло-серый |
| 7 | `#compare` — сравнение | `dark v1 commercial` | Тёмно-синий |
| 8 | `#config` — комплектация | `v1 commercial` | Белый |
| 9 | `#delivery` — поставка | `grey v1 commercial` | Светло-серый |
| 10 | `#gov` — госзакупки | `dark v1 trust-section` | Тёмно-синий |
| 11 | `#plant` — завод | `v1 trust-section` | Белый |
| 12 | `#faq` — вопросы покупателей | `grey faq v1 trust-section` | Светло-серый |
| 13 | `#order` — контакты | `grey v1 trust-section` | Светло-серый |
| 14 | `#qlist` — вопросы к заводу | Без класса | Светло-жёлтый, `#FFF8DC`. Скрыта по умолчанию, видна в режиме согласования |

## Кнопки и формы

В HTML **13 ссылок с `data-request-form`**, которые открывают 5 сценариев. У всех 13 стоит `href="#order"`, включая ссылку в шапке и кнопку официального КП.

| `data-source-section` | `data-source-cta` | `data-request-form` |
|---|---|---|
| `sticky` | `sticky-price` | `price_quote` |
| `top` | `hero-price` | `price_quote` |
| `specs` | `specs-fit` | `configuration_help` |
| `price` | `payment-calculator` | `price_quote` |
| `acceptance` | `acceptance-accuracy` | `configuration_help` |
| `design` | `design-price` | `price_quote` |
| `compare` | `compare-request` | `repair_comparison` |
| `config` | `config-request` | `configuration_help` |
| `delivery` | `delivery-quote` | `price_quote` |
| `gov` | `gov-documents` | `procurement_documents` |
| `gov` | `gov-nmck` | `procurement_nmck` |
| `plant` | `plant-region` | `price_quote` |
| `order` | `order-price` | `price_quote` |

## Файлы и связи

Разметка всех четырёх компонентов находится в `index.html`. Пути в таблице указаны от корня репозитория.

| Компонент | Основные файлы | Связь в исходном коде |
|---|---|---|
| Мастер и справочник | `assets/js/sf676-selector-model.js`, `assets/js/sf676-selector.js`, `assets/css/sf676-selector.css` | В `#config` мастер `#sf676-selector` стоит перед справочником `#config-reference`. При ручном подборе «Подробнее об этом параметре» раскрывает справочник и ставит фокус на заголовок параметра по номеру шага. Из результата мастер открывает `configuration_help` с `context.selector` и источником `config/selector-exact-result` или `config/selector-quiz-result`. Это динамическая ссылка с `data-selector-action`, для неё также задан переход к `#order`. |
| Калькулятор | `assets/js/payment-model.js`, `assets/js/payment-calculator.js`, `assets/css/payment-calculator.css` | В `#price` находится `#payment-calculator`. «Получить официальное КП» помечена `data-payment-calculator`. Обработчик формы получает актуальный расчёт через `SF676Payments.getCalculation()` и передаёт его в `price_quote` как `context.calculation`. Без действительного расчёта форма открывается без сводки платежей. |
| Формы | `assets/js/request-forms.js`, `assets/css/request-forms.css` | Обычные ссылки передают сценарий и оба атрибута источника в `#request-dialog`. Для результата мастера используется `SF676Requests.open()`. Обработчик проверяет контекст, показывает сводку и включает её в черновик. |
| Карта | `assets/js/delivery-map.js`, `assets/css/delivery-map.css`, `assets/data/delivery-points.json` | Внутри `#plant` модуль находит `#delivery-geography` и вызывает `mountDeliveryMap` с ключом из метатега. Загрузка начинается при приближении контейнера к области просмотра (300 px), а при отсутствии `IntersectionObserver` — сразу. SDK рисует карту в `.delivery-canvas`. При отсутствии ключа остаётся статический список. |

## Какие проверки зависят от разметки

| Проверка | Зависимость |
|---|---|
| `tests/verify-preservation.py`, `tests/verify-payment-preservation.py`, `tests/verify-selector-preservation.py` | Все три ожидают точный порядок 13 ID от `top` до `order`, исключая `qlist`. В списке `price` занимает 4-е место. Платёжная проверка отдельно ищет заголовок, вводный текст и условия покупки внутри `#price`. Проверка мастера сверяет элементы справочника в `#config`. |
| `tests/payment-calculator.html` | Ожидает `sourceSection === 'price'` у черновика КП, четыре условия в `#price .purchase-conditions` без JavaScript и 13 основных секций. |
| `tests/request-forms.html` | Перед проверкой кнопки закреплённой шапки прокручивает страницу к `#price`. Также ожидает 13 кнопок и, без JavaScript, 13 основных секций. |
| `tests/selector.html` | В режиме согласования ожидает, что ссылка вопроса `oplata` приведёт к пометке внутри секции `price`. |

## Командные проверки

Сохранённые результаты относятся к вершине [PR №23](https://github.com/volkov43-beep/sf676/pull/23), `5fa739cf879ed02d2d0b32117d3c9c593e205115`. У неё и исходного `f32b47d` один Git tree — `0b6fd91360bc06937a26165f36881215a21dba08`. Совпадают исходники, тесты, workflow и все остальные отслеживаемые файлы. [Отчёт локального прогона](../header-form/README.md) фиксирует успешный результат. Шаги [pr-checks.yml](../../.github/workflows/pr-checks.yml) также подтверждены [журналом CI PR №23](https://github.com/volkov43-beep/sf676/actions/runs/43440844887/job/131937730237). В 1А результаты использованы без повторного запуска.

В таблице `P` — проверенная версия `5fa739c` с тем же деревом, что и `f32b47d`. Для трёх проверок сохранности `$base` — временная копия `index.html` из `a6942424d5268d7349b6ba542cbe75e971ebe8bc` (извлечение командой `git show a694242:index.html > "$base"`). Именно эту базу указывает отчёт PR №23. Скрипты принимают базовый и текущий HTML, их обычный режим в `tests/preservation.py` проверяет изменения шапки и формы. В командах сборки `site="$RUNNER_TEMP/sf676-pr"`, `YANDEX_MAPS_API_KEY=synthetic-ci-only`.

| Проверка | Команда и проверенные версии | Статус | Краткий результат |
|---|---|---|---|
| Синтаксис JS | P · `for file in assets/js/*.js; do node --check "$file"; done` | Пройдено | Все 6 файлов прошли проверку синтаксиса. |
| Синтаксис Python | P · `python3 -m compileall -q scripts tests` | Пройдено | Модули в обоих каталогах скомпилированы. |
| Тесты Node.js | P · `node --test tests/*.test.cjs tests/*.test.mjs` | Пройдено | 20 из 20, включая модели подбора и платежей, границы карты и обработку касаний. |
| Реестр поставок | P · `python3 tests/delivery-points.py` | Пройдено | 90 уникальных точек, из них 73 российских и 17 зарубежных. |
| Статический список | P · `python3 scripts/delivery-directory.py --check` | Пройдено | Список в HTML совпал с данными реестра. |
| Сборка | P · `python3 scripts/build-pages.py "$site"` | Пройдено | Создана временная копия сайта. |
| Ключ карты в сборке | P · `grep -Fq '<meta name="yandex-maps-key" content="synthetic-ci-only">' "$site/index.html"` | Пройдено | Тестовый ключ найден в собранном HTML. |
| Файлы сборки | P · `diff -qr assets "$site/assets"` | Пройдено | Каталоги совпали. |
| Сохранность страницы | `a694242 → P` · `python3 tests/verify-preservation.py "$base" index.html` | Пройдено | Подтверждены порядок секций и сохранность содержимого. |
| Сохранность калькулятора | `a694242 → P` · `python3 tests/verify-payment-preservation.py "$base" index.html` | Пройдено | Подтверждены исходная схема платежей и условия покупки. |
| Сохранность мастера | `a694242 → P` · `python3 tests/verify-selector-preservation.py "$base" index.html` | Пройдено | Подтверждена сохранность справочника и остальных секций. |
| Историческая проверка первого экрана | `tests/verify-hero-preservation.py` · прежняя [итерация 07](../iteration-07/README.md) | Не применимо | Проверяет замену первого экрана в другой итерации. В набор приёмки PR №23 не входит. |

Ошибок и блокировок среды среди применимых командных проверок не зафиксировано. Браузерные HTML-тесты мастера, калькулятора и форм, опубликованная страница и скриншоты в объём 1А не входят.

## Передача в часть 1Б

> При увеличении текста до 200% после первого шага ручного подбора фокус переходит правильно, но индикатор следующего шага частично уходит под шапку. Это произошло на всех четырёх ширинах стенда.

Сообщено в предыдущем рабочем чате; в части 1А независимо не проверялось.

**1Б — только браузерная проверка мастера подбора.** Стенд — `tests/selector.html`, ширины 320, 390, 768 и 1366 px. При переходе с первого на второй шаг ручного подбора с текстом 200% отдельно зафиксировать, куда перешёл фокус и виден ли индикатор целиком под закреплённой шапкой.

## Часть 1Б

- Дата начала — 13 ноября 2026 года.
- Проверяемая версия рабочей копии — `1590b6e69f722fee461d9ba4e1ba703425b3f3bf`. По сравнению с исходным `f32b47d524c920760b12dfbd91ceef6a00c8d0b7` изменён только отчёт 1А.
- Стенд — `tests/selector.html` через локальный HTTP-сервер. Проверяются две кнопки стенда, «Проверить мастер» и «Проверить формы и fallback», включая передачу результата мастера в форму. Область записи — `docs/reorder/`.
- Статус при первом сохранении — «Начата; браузерные результаты ещё не получены».

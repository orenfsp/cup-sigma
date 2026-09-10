import json
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models import User, Category, RoutingRule, Appeal, Message, InternalNote, AuditLog
from security import hash_password, generate_track_number


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Create Default Users if not exist
        if db.query(User).count() == 0:
            users_to_create = [
                User(
                    username="admin",
                    password_hash=hash_password("admin123"),
                    role="admin",
                    full_name="Елена Романова (Главный Администратор)",
                    specialization=None,
                    max_active_appeals=99
                ),
                User(
                    username="operator",
                    password_hash=hash_password("operator123"),
                    role="operator",
                    full_name="Ольга Васильева (Оператор 1-й линии)",
                    specialization=None,
                    max_active_appeals=50
                ),
                User(
                    username="expert_psy",
                    password_hash=hash_password("expert123"),
                    role="expert",
                    full_name="Анна Соколова (Кризисный психолог)",
                    specialization="psychology",
                    max_active_appeals=8
                ),
                User(
                    username="expert_law",
                    password_hash=hash_password("expert123"),
                    role="expert",
                    full_name="Дмитрий Морозов (Юрист по защите прав несовершеннолетних)",
                    specialization="law",
                    max_active_appeals=8
                ),
                User(
                    username="expert_conf",
                    password_hash=hash_password("expert123"),
                    role="expert",
                    full_name="Ирина Волкова (Медиатор и конфликтолог)",
                    specialization="conflictology",
                    max_active_appeals=8
                ),
            ]
            db.add_all(users_to_create)
            db.commit()

        # 2. Create Categories
        categories_data = [
            {"name": "Травля и оскорбления", "desc": "Систематические насмешки, бойкот, обидные прозвища", "spec": "psychology", "prio": "standard"},
            {"name": "Конфликт с одноклассниками", "desc": "Ссоры, недопонимание, разногласия в классе", "spec": "conflictology", "prio": "standard"},
            {"name": "Кибербуллинг", "desc": "Травля в социальных сетях, мессенджерах, слив переписок", "spec": "psychology", "prio": "standard"},
            {"name": "Давление и угрозы", "desc": "Шантаж, вымогательство, запугивание", "spec": "law", "prio": "urgent"},
            {"name": "Конфликт с учителем", "desc": "Предвзятое отношение, занижение оценок, публичные оскорбления", "spec": "conflictology", "prio": "standard"},
            {"name": "Конфликт с родителями", "desc": "Непонимание дома, чрезмерные требования, давление", "spec": "psychology", "prio": "standard"},
            {"name": "Вопрос юридического характера", "desc": "Права школьника, комиссии ПДН, перевод в другую школу", "spec": "law", "prio": "standard"},
            {"name": "Не знаю как назвать", "desc": "Сложная или смешанная ситуация, требуется помощь в классификации", "spec": "psychology", "prio": "standard"},
        ]

        if db.query(Category).count() == 0:
            for cat_item in categories_data:
                category = Category(
                    name=cat_item["name"],
                    description=cat_item["desc"],
                    default_specialization=cat_item["spec"],
                    default_priority=cat_item["prio"],
                    is_active=True
                )
                db.add(category)
            db.commit()

        # 3. Create Routing Rules
        if db.query(RoutingRule).count() == 0:
            categories = {c.name: c for c in db.query(Category).all()}
            rules = [
                RoutingRule(category_id=categories["Травля и оскорбления"].id, specialist_group="psychology", max_load_limit=8, priority_modifier="standard"),
                RoutingRule(category_id=categories["Конфликт с одноклассниками"].id, specialist_group="conflictology", max_load_limit=8, priority_modifier="standard"),
                RoutingRule(category_id=categories["Кибербуллинг"].id, specialist_group="psychology", max_load_limit=8, priority_modifier="standard"),
                RoutingRule(category_id=categories["Давление и угрозы"].id, specialist_group="law", max_load_limit=6, priority_modifier="urgent"),
                RoutingRule(category_id=categories["Конфликт с учителем"].id, specialist_group="conflictology", max_load_limit=8, priority_modifier="standard"),
                RoutingRule(category_id=categories["Конфликт с родителями"].id, specialist_group="psychology", max_load_limit=8, priority_modifier="standard"),
                RoutingRule(category_id=categories["Вопрос юридического характера"].id, specialist_group="law", max_load_limit=6, priority_modifier="standard"),
                RoutingRule(category_id=categories["Не знаю как назвать"].id, specialist_group="psychology", max_load_limit=10, priority_modifier="standard"),
            ]
            db.add_all(rules)
            db.commit()

        # 4. Create Demo Seed Appeals for Quick Demonstration
        if db.query(Appeal).count() == 0:
            cat_map = {c.name: c.id for c in db.query(Category).all()}
            expert_psy = db.query(User).filter(User.username == "expert_psy").first()
            expert_law = db.query(User).filter(User.username == "expert_law").first()

            # Appeal 1: Waiting for Operator (New free text from student)
            app1 = Appeal(
                track_number="ОТК-DEMO-NEW1",
                applicant_type="student",
                initial_text="В последнее время ребята из параллели постоянно караулят меня у раздевалки и отбирают вещи. В классном чате создали стикеры с моим лицом и смеются. Мне очень тяжело ходить в школу.",
                category_id=cat_map.get("Травля и оскорбления"),
                priority="standard",
                status="new",
                is_crisis=False,
                clarification_answers=json.dumps({"где происходит": "В школе у раздевалки и в Telegram", "как давно": "Около двух недель", "обращался ли к кому-то": "Нет, боюсь сделать хуже"}),
                created_at=datetime.utcnow() - timedelta(minutes=25)
            )

            # Appeal 2: Crisis Appeal (Urgent!)
            app2 = Appeal(
                track_number="ОТК-CRIS-HELP",
                applicant_type="student",
                initial_text="Мне угрожают расправой старшеклассники, сказали завтра после уроков поймают и жестоко изобьют, если не принесу пять тысяч рублей. У меня нет таких денег, я в отчаянии, не хочу жить.",
                category_id=cat_map.get("Давление и угрозы"),
                priority="urgent",
                status="new",
                is_crisis=True,
                crisis_reasons="угрожают расправой, изобьют, не хочу жить",
                emergency_contact="Telegram: @help_me_please",
                clarification_answers=json.dumps({"где происходит": "Рядом со школой", "кто участвует": "Группа из 11 класса", "обращался ли к кому-то": "Боюсь рассказывать родителям"}),
                created_at=datetime.utcnow() - timedelta(minutes=8)
            )

            # Appeal 3: In Progress (Assigned to Psychologist)
            app3 = Appeal(
                track_number="ОТК-PROG-TEST",
                applicant_type="parent",
                initial_text="Здравствуйте. Мой сын учится в 7 классе, в последний месяц замкнулся, оценки скатились, отказывается идти в школу по утрам. Подозреваю конфликт с учителем математики.",
                category_id=cat_map.get("Конфликт с учителем"),
                priority="standard",
                status="in_progress",
                assigned_expert_id=expert_psy.id if expert_psy else None,
                is_crisis=False,
                created_at=datetime.utcnow() - timedelta(hours=3),
                operator_taken_at=datetime.utcnow() - timedelta(hours=2, minutes=45)
            )

            # Appeal 4: Answer Ready (To test "Это помогло" / "Это не помогло")
            app4 = Appeal(
                track_number="ОТК-ANSW-DONE",
                applicant_type="student",
                initial_text="Привет. У меня конфликт с лучшей подругой из-за того, что она рассказала другим мой секрет. Как с ней поговорить, чтобы не поругаться окончательно?",
                category_id=cat_map.get("Конфликт с одноклассниками"),
                priority="standard",
                status="answer_ready",
                assigned_expert_id=expert_psy.id if expert_psy else None,
                is_crisis=False,
                created_at=datetime.utcnow() - timedelta(days=1),
                operator_taken_at=datetime.utcnow() - timedelta(hours=23),
                first_response_at=datetime.utcnow() - timedelta(hours=20)
            )

            db.add_all([app1, app2, app3, app4])
            db.commit()

            # Add sample messages to app4
            msg1 = Message(
                appeal_id=app4.id,
                sender_type="applicant",
                sender_display_name="Заявитель",
                content="Привет. У меня конфликт с лучшей подругой из-за того, что она рассказала другим мой секрет. Как с ней поговорить, чтобы не поругаться окончательно?",
                created_at=datetime.utcnow() - timedelta(days=1)
            )
            msg2 = Message(
                appeal_id=app4.id,
                sender_type="expert",
                sender_display_name="Психолог",
                content="Здравствуй! Понимаю, как обидно столкнуться с нарушением доверия от близкого человека. Вот несколько шагов, которые помогут мягко прояснить ситуацию:\n1. Выбери спокойный момент наедине, без свидетелей.\n2. Используй 'Я-сообщения': вместо 'Ты предала меня', скажи: 'Мне было очень больно, когда о моем секрете узнали другие'.\n3. Спроси, почему она так поступила — иногда это происходит случайно или по недомыслию.\nПопробуй этот разговор и напиши, как всё прошло!",
                created_at=datetime.utcnow() - timedelta(hours=2)
            )
            note = InternalNote(
                appeal_id=app4.id,
                author_id=expert_psy.id if expert_psy else 1,
                author_name="Анна Соколова (Психолог)",
                content="Заявитель сильно расстроен, но ситуация межличностная, без признаков буллинга. Даны рекомендации по технике Я-сообщений.",
                created_at=datetime.utcnow() - timedelta(hours=2)
            )
            db.add_all([msg1, msg2, note])
            db.commit()

            # Add Audit Log entry
            audit = AuditLog(
                user_id=1,
                username="admin",
                action="system_init",
                target_type="system",
                target_id=None,
                reason="Первичная инициализация системы и маршрутизации",
                details="Настроены 8 категорий и правила маршрутизации",
                created_at=datetime.utcnow()
            )
            db.add(audit)
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
    print("Seed data applied successfully!")

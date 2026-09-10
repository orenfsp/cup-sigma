from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), nullable=False)  # operator, expert, admin
    full_name = Column(String(128), nullable=False)
    specialization = Column(String(64), nullable=True)  # psychology, law, conflictology, social_pedagogy
    max_active_appeals = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_appeals = relationship("Appeal", foreign_keys="[Appeal.assigned_expert_id]", back_populates="assigned_expert")
    co_assigned_appeals = relationship("Appeal", foreign_keys="[Appeal.co_expert_id]", back_populates="co_expert")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    default_specialization = Column(String(64), default="psychology")
    default_priority = Column(String(32), default="standard")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appeals = relationship("Appeal", back_populates="category")
    rules = relationship("RoutingRule", back_populates="category")


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    specialist_group = Column(String(64), nullable=False)  # psychology, law, conflictology, social_pedagogy
    max_load_limit = Column(Integer, default=8)
    priority_modifier = Column(String(32), default="standard")
    is_active = Column(Boolean, default=True)

    category = relationship("Category", back_populates="rules")


class Appeal(Base):
    __tablename__ = "appeals"

    id = Column(Integer, primary_key=True, index=True)
    track_number = Column(String(32), unique=True, index=True, nullable=False)
    applicant_type = Column(String(32), nullable=False)  # student, parent, teacher
    initial_text = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    priority = Column(String(32), default="standard", index=True)  # urgent, standard, low
    status = Column(String(32), default="new", index=True)
    # Status values:
    # 'new', 'assigned', 'in_progress', 'needs_clarification',
    # 'answer_ready', 'returned', 'completed', 'rejected', 'closed_no_response'

    is_crisis = Column(Boolean, default=False, index=True)
    crisis_reasons = Column(Text, nullable=True)
    emergency_contact = Column(String(256), nullable=True)  # Isolated! Visible only to operator for crisis cases

    assigned_expert_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    co_expert_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    transfer_requested_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    transfer_reason = Column(Text, nullable=True)

    return_count = Column(Integer, default=0)
    return_reason = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    clarification_answers = Column(Text, nullable=True)  # JSON-encoded dict of answers
    rating = Column(Integer, nullable=True)  # 1-5
    rating_comment = Column(Text, nullable=True)
    complaint = Column(Text, nullable=True)  # Visible to operator, never to expert

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    operator_taken_at = Column(DateTime, nullable=True)
    first_response_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("Category", back_populates="appeals")
    assigned_expert = relationship("User", foreign_keys=[assigned_expert_id], back_populates="assigned_appeals")
    co_expert = relationship("User", foreign_keys=[co_expert_id], back_populates="co_assigned_appeals")
    messages = relationship("Message", back_populates="appeal", cascade="all, delete-orphan", order_by="Message.created_at")
    internal_notes = relationship("InternalNote", back_populates="appeal", cascade="all, delete-orphan", order_by="InternalNote.created_at")
    attachments = relationship("Attachment", back_populates="appeal", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    appeal_id = Column(Integer, ForeignKey("appeals.id"), nullable=False, index=True)
    sender_type = Column(String(32), nullable=False)  # applicant, expert, system
    sender_display_name = Column(String(64), nullable=False)  # Unified voice: "Специалист", "Психолог", "Заявитель"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    appeal = relationship("Appeal", back_populates="messages")


class InternalNote(Base):
    __tablename__ = "internal_notes"

    id = Column(Integer, primary_key=True, index=True)
    appeal_id = Column(Integer, ForeignKey("appeals.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(128), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    appeal = relationship("Appeal", back_populates="internal_notes")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    appeal_id = Column(Integer, ForeignKey("appeals.id"), nullable=False, index=True)
    filename = Column(String(256), nullable=False)
    filepath = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    appeal = relationship("Appeal", back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)  # status_change, reassign, priority_change, routing_rule_edit, etc.
    target_type = Column(String(32), nullable=False)  # appeal, category, user, routing_rule
    target_id = Column(Integer, nullable=True)
    reason = Column(Text, nullable=False)  # Required reason for audit trail!
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

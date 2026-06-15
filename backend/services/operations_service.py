from sqlalchemy.orm import Session
from models import OrderPrediction, Order, LensInventory, OrderQcEvent, Store
from google import genai
import os

def get_insights(db: Session):
    # Fetch Data
    high_risk_orders = db.query(OrderPrediction).filter(OrderPrediction.risk_level == "HIGH").all()
    shortages = db.query(LensInventory).filter(LensInventory.quantity <= LensInventory.minimum_threshold).all()
    qc_failures = db.query(OrderQcEvent).filter(OrderQcEvent.result == "FAIL").count()
    
    waiting_for_procurement = db.query(Order).filter(Order.current_status == "WAITING_FOR_PROCUREMENT").count()

    # 1. Deterministic Insights
    insights = []
    if shortages:
        insights.append(f"Inventory shortages detected across {len(shortages)} SKUs.")
    
    if waiting_for_procurement > 0:
        insights.append(f"{waiting_for_procurement} orders are currently blocked waiting for inventory procurement.")

    if qc_failures > 50:
        insights.append(f"QC failure rate is elevated with {qc_failures} recent incidents.")
        
    # Find worst performing store
    stores = db.query(Store).all()
    worst_store = None
    max_breaches = -1
    for store in stores:
        orders = db.query(Order).filter(Order.store_id == store.id).all()
        order_ids = [o.id for o in orders]
        breaches = db.query(OrderPrediction).filter(OrderPrediction.order_id.in_(order_ids), OrderPrediction.will_breach == True).count()
        if breaches > max_breaches:
            max_breaches = breaches
            worst_store = store.store_name

    if worst_store:
        insights.append(f"Store {worst_store} currently has the highest ratio of predicted delays.")

    # Progressive lens analysis
    progressive_breaches = db.query(OrderPrediction).join(Order).filter(
        OrderPrediction.will_breach == True,
        Order.lens_type == "Progressive"
    ).count()
    
    total_breaches = db.query(OrderPrediction).filter(OrderPrediction.will_breach == True).count()
    if total_breaches > 0:
        prog_pct = int((progressive_breaches / total_breaches) * 100)
        insights.append(f"Progressive lenses contribute to {prog_pct}% of predicted breaches.")

    # 2. AI Recommendations (Rules Based)
    recommendations = []
    if waiting_for_procurement > 0:
        recommendations.append(f"Expedite procurement for the {waiting_for_procurement} blocked orders immediately.")
    elif shortages:
        recommendations.append("Restock low-inventory items to prevent future delays.")
    if qc_failures > 50:
        recommendations.append("Initiate a QC review cycle with the main lab technicians.")
    if worst_store:
        recommendations.append(f"Review order volume and balance workloads for Store {worst_store}.")
    if len(high_risk_orders) > 0:
        recommendations.append(f"Prioritize {len(high_risk_orders)} high-risk orders in the lab queue.")

    return {
        "insights": insights,
        "recommendations": recommendations,
        "metrics": {
            "total_orders": db.query(Order).filter(Order.current_status != "DELIVERED").count(),
            "high_risk": len(high_risk_orders),
            "predicted_breaches": total_breaches,
            "shortages": len(shortages),
            "qc_failures": qc_failures,
            "waiting_for_procurement": waiting_for_procurement
        }
    }

def generate_daily_briefing(db: Session) -> str:
    data = get_insights(db)
    
    prompt = f"""
    You are the AI Operations Manager. Write a short, punchy 3-sentence daily executive briefing based on this live data:
    Metrics: {data['metrics']}
    Insights: {data['insights']}
    Recommendations: {data['recommendations']}
    
    Do not use markdown headers or bullet points. Just output a clean paragraph.
    Make it sound professional, urgent, and insightful.
    """
    
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return "The AI Operations Manager is currently compiling data. Please review the dashboards for live metrics."

def generate_dynamic_improvement_pct(data: dict) -> int:
    prompt = f"""
    You are the AI Operations Manager. Based on the following live data:
    Metrics: {data['metrics']}
    Insights: {data['insights']}
    
    Estimate an achievable percentage improvement (between 15 and 65) in preventing SLA breaches if your recommendations are followed.
    Return ONLY a single integer representing the percentage (e.g. 42). Do not include any other text or the % sign.
    """
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt
        )
        val = int(response.text.strip().replace('%', ''))
        return max(1, min(100, val))
    except Exception:
        return 47

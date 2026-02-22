from flask import Blueprint, request, jsonify, render_template
from services.inventory_service import InventoryService
import pandas as pd
import os

inventory_bp = Blueprint("inventory", __name__)
service = InventoryService()


@inventory_bp.route("/", methods=["GET"])
def inventory_page():
    return render_template("inventory.html")


@inventory_bp.route("/items", methods=["GET"])
def list_inventory():
    """Return all inventory rows as JSON."""
    path = "data_base/inventory.csv"
    if not os.path.exists(path):
        return jsonify([])
    try:
        df = pd.read_csv(path)
        df = df.where(pd.notnull(df), None)
        inv_type = request.args.get("type")
        if inv_type:
            df = df[df["inventory_type"] == inv_type.upper()]
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/evaluate-production", methods=["POST"])
def evaluate_production():
    payload = request.json

    result = service.evaluate_production(
        finished_product_id=payload["finished_product_id"],
        quantity_to_produce=payload["quantity_to_produce"]
    )

    return jsonify(result)

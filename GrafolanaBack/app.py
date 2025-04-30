import os
from typing import List, Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from GrafolanaBack.domain.metadata import metadata_service
from GrafolanaBack.domain.prices.sol_price_utils import start_price_updater
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService
from GrafolanaBack.domain.spam.service import SpamService
from GrafolanaBack.domain.spam.model import Creator
from GrafolanaBack.domain.infrastructure.db.migration_service import check_and_run_migrations
from solders.signature import Signature
from solders.pubkey import Pubkey
from dotenv import load_dotenv

load_dotenv()
CORS_DOMAIN = os.getenv("CORS_DOMAIN")
PORT = os.getenv("PORT", 5000)

app = Flask(__name__)
application = app  # For WSGI compatibility
handler = app # For Vercel compatibility

# Run database migrations if needed
check_and_run_migrations()

cors = CORS(app, resources={r"/api/*": {"origins": CORS_DOMAIN}})
compress = Compress()
compress.init_app(app)

start_price_updater() # Start the price updater in a separate thread

transaction_parser_service = TransactionParserService()
spam_service = SpamService()

@app.route("/")
def hello():
  return """

    Flask is working on HelioHost.<br><br>

  """

@app.route('/api/get_transaction_from_signature', methods=['POST'])
def get_transaction_from_signature():
    tx_signature = request.json.get('tx_signature')

    if Signature.verify(tx_signature) is None:
        return jsonify({"error": "Invalid transaction signature"}), 400

    return transaction_parser_service.getJSONTransaction(tx_signature)


@app.route('/api/get_transaction_graph_data', methods=['POST'])
def get_transaction_graph_data_from_signature():
    tx_signature = request.json.get('tx_signature')
    user_wallet = request.json.get('user_wallet', "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz")
    
    try:
        Signature.from_string(tx_signature)
    except ValueError:
        return jsonify({"error": "Invalid transaction signature"}), 400

    # Get the graph data
    graph_data = transaction_parser_service.get_transaction_graph_data(tx_signature)
    
    return jsonify(graph_data)

@app.route('/api/get_wallet_graph_data', methods=['POST'])
def get_wallet_graph_data_from_address():
    wallet_signature = request.json.get('wallet_signature')

    try:
        Pubkey.from_string(wallet_signature)
    except ValueError:
        return jsonify({"error": "Invalid wallet address"}), 400

    # Get the graph data
    graph_data = transaction_parser_service.get_wallet_graph_data(wallet_signature)
    
    return jsonify(graph_data)

# Metadata API Endpoints
@app.route('/api/metadata/get_mints_info', methods=['POST'])
def get_mints_info_from_addresses():
    mint_addresses: List[str] = request.json.get('addresses')
    token_data_list = metadata_service.get_token_metadata(mint_addresses)
    return jsonify(token_data_list)

@app.route('/api/metadata/labels', methods=['POST'])
def get_labels():
    """
    Endpoint to retrieve labels for a list of addresses.
    
    Request JSON format:
    {
        "addresses": ["address1", "address2", ...],
        "user_id": "optional_user_id"
    }
    """
    data = request.json
    addresses: List[str] = data.get('addresses', [])
    user_id: Optional[str] = data.get('user_id')
    
    if not addresses:
        return jsonify({"error": "No addresses provided"}), 400
    
    labels = metadata_service.get_labels(addresses, user_id)
    return jsonify(labels)

@app.route('/api/metadata/labels/user', methods=['POST', 'DELETE'])
def manage_user_labels():
    """
    Endpoint to create, update, or delete user-specific labels.
    """
    data = request.json
    address: str = data.get('address')
    user_id: str = data.get('user_id')
    
    if not address or not user_id:
        return jsonify({"error": "Address and user_id are required"}), 400
        
    if request.method == 'POST':
        label_text: str = data.get('label')
        description: Optional[str] = data.get('description')
        
        if not label_text:
            return jsonify({"error": "Label is required"}), 400
            
        result = metadata_service.create_or_update_user_label(
            address, label_text, user_id, description
        )
        return jsonify(result)
        
    elif request.method == 'DELETE':
        success = metadata_service.delete_user_label(address, user_id)
        if success:
            return jsonify({"status": "success", "message": "Label deleted"})
        else:
            return jsonify({"status": "not_found", "message": "Label not found"}), 404

@app.route('/api/metadata/programs', methods=['POST'])
def get_program_metadata():
    program_addresses = request.json.get('addresses')
    program_metadatas = metadata_service.get_program_metadata(program_addresses)
    if not program_metadatas:
        return jsonify([])
    else:
        return jsonify(program_metadatas)

# Spam API Endpoints
@app.route('/api/metadata/spam', methods=['GET'])
def get_all_spam():
    """
    Endpoint to retrieve all spam addresses with pagination.
    
    Query parameters:
    - limit: Maximum number of results to return (default: 100)
    - offset: Number of results to skip (default: 0)
    """
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    spam_addresses = spam_service.get_all_spam(limit=limit, offset=offset)
    return jsonify(spam_addresses)

@app.route('/api/metadata/spam/user/<user_id>', methods=['GET'])
def get_spam_for_user(user_id):
    """
    Endpoint to retrieve all ADMIN/DEFAULT spam plus user-specific spam.
    
    URL parameters:
    - user_id: The ID of the user to get spam for
    """
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    spam_addresses = spam_service.get_spam_for_user(user_id)
    return jsonify(spam_addresses)

@app.route('/api/metadata/spam', methods=['POST'])
def create_spam():
    """
    Endpoint to create a new spam entry.
    
    Request JSON format:
    {
        "address": "solana_address",
        "creator": "DEFAULT|ADMIN|OWNER|USER",
        "user_id": "optional_user_id"
    }
    """
    data = request.json
    address = data.get('address')
    user_id = data.get('user_id')
    
    if not address:
        return jsonify({"error": "Address is required"}), 400
        
    # Validate creator type

    creator = Creator.USER

    try:
        spam = spam_service.create_spam(address=address, creator=creator, user_id=user_id)
        return jsonify(spam), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/metadata/spam/<int:spam_id>', methods=['DELETE'])
def delete_spam(spam_id):
    """
    Endpoint to delete a spam entry.
    
    URL parameters:
    - spam_id: The ID of the spam entry to delete
    
    Request JSON format:
    {
        "user_id": "user_identifier"
    }
    """
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    if spam_service.delete_user_spam(spam_id, user_id):
        return jsonify({"status": "success", "message": "Spam entry deleted successfully"}), 200
    else:
        return jsonify({"status": "not_found", "message": "Spam entry not found or you don't have permission to delete it"}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)

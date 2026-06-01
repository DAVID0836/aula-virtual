FROM python:3.12-slim

WORKDIR /app

COPY . .

RUN pip install flask flask-cors mysql-connector-python

EXPOSE 5000

CMD ["python", "app.py"]
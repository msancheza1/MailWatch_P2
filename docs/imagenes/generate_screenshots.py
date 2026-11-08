import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('docs/imagenes', exist_ok=True)

font_regular = 'C:/Windows/Fonts/segoeui.ttf'
font_bold = 'C:/Windows/Fonts/segoeuib.ttf'

def get_font(size, bold=False):
    return ImageFont.truetype(font_bold if bold else font_regular, size)

def draw_rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

# 1. 01-acceso-login.png
def make_login():
    w, h = 900, 560
    im = Image.new('RGB', (w, h), '#f1f5f9')
    d = ImageDraw.Draw(im)
    
    cx0, cy0, cx1, cy1 = 250, 40, 650, 510
    draw_rounded_rect(d, (cx0, cy0, cx1, cy1), 16, '#ffffff', '#e2e8f0', 2)
    
    d.ellipse((405, 65, 445, 105), fill='#315ce7')
    d.text((415, 72), "M", font=get_font(22, True), fill='#ffffff')
    d.text((455, 72), "MailWatch", font=get_font(24, True), fill='#172338')
    d.text((320, 120), "Inicia sesion en tu cuenta", font=get_font(18, True), fill='#1e293b')
    d.text((305, 145), "Monitorea y protege tu bandeja de correo", font=get_font(13), fill='#64748b')
    
    d.text((280, 185), "Correo electronico", font=get_font(13, True), fill='#334155')
    draw_rounded_rect(d, (280, 210, 620, 255), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((295, 222), "analista@seguridad.co", font=get_font(14), fill='#1e293b')
    
    d.text((280, 275), "Contrasena", font=get_font(13, True), fill='#334155')
    draw_rounded_rect(d, (280, 300, 620, 345), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((295, 312), "••••••••••••••••", font=get_font(14), fill='#64748b')
    
    draw_rounded_rect(d, (280, 370, 620, 420), 8, '#315ce7', None)
    d.text((410, 383), "Iniciar sesion", font=get_font(15, True), fill='#ffffff')
    
    d.text((325, 450), "¿No tienes una cuenta?", font=get_font(13), fill='#64748b')
    d.text((475, 450), "Crear cuenta", font=get_font(13, True), fill='#315ce7')
    
    im.save('docs/imagenes/pantalla-01-acceso-login.png')

# 2. 02-registro-usuario.png
def make_register():
    w, h = 900, 620
    im = Image.new('RGB', (w, h), '#f1f5f9')
    d = ImageDraw.Draw(im)
    
    cx0, cy0, cx1, cy1 = 250, 30, 650, 580
    draw_rounded_rect(d, (cx0, cy0, cx1, cy1), 16, '#ffffff', '#e2e8f0', 2)
    
    d.ellipse((405, 55, 445, 95), fill='#315ce7')
    d.text((415, 62), "M", font=get_font(22, True), fill='#ffffff')
    d.text((455, 62), "MailWatch", font=get_font(24, True), fill='#172338')
    d.text((330, 110), "Registro de nuevo usuario", font=get_font(18, True), fill='#1e293b')
    d.text((300, 135), "Crea tu acceso corporativo al sistema", font=get_font(13), fill='#64748b')
    
    d.text((280, 170), "Correo electronico corporativo", font=get_font(13, True), fill='#334155')
    draw_rounded_rect(d, (280, 195, 620, 240), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((295, 207), "nuevo.usuario@empresa.com", font=get_font(14), fill='#1e293b')
    
    d.text((280, 255), "Contrasena (minimo 8 caracteres)", font=get_font(13, True), fill='#334155')
    draw_rounded_rect(d, (280, 280, 620, 325), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((295, 292), "••••••••••••", font=get_font(14), fill='#64748b')
    
    d.text((280, 340), "Confirmar contrasena", font=get_font(13, True), fill='#334155')
    draw_rounded_rect(d, (280, 365, 620, 410), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((295, 377), "••••••••••••", font=get_font(14), fill='#64748b')
    
    draw_rounded_rect(d, (280, 435, 620, 485), 8, '#10b981', None)
    d.text((410, 448), "Crear cuenta", font=get_font(15, True), fill='#ffffff')
    
    d.text((320, 520), "¿Ya tienes una cuenta registrada?", font=get_font(13), fill='#64748b')
    d.text((515, 520), "Ingresar", font=get_font(13, True), fill='#315ce7')
    
    im.save('docs/imagenes/pantalla-02-registro-usuario.png')

# 3. 03-dashboard-principal.png
def make_dashboard():
    w, h = 1000, 540
    im = Image.new('RGB', (w, h), '#f8fafc')
    d = ImageDraw.Draw(im)
    
    draw_rounded_rect(d, (20, 20, 220, 510), 12, '#ffffff', '#e2e8f0', 1)
    d.text((40, 45), "[#] MailWatch", font=get_font(18, True), fill='#315ce7')
    d.text((40, 95), "ESPACIO DE TRABAJO", font=get_font(11, True), fill='#94a3b8')
    
    items = ["- Resumen", "- Correos", "- Cuarentena", "- Configuracion", "- Metricas (Admin)"]
    for i, it in enumerate(items):
        bg = '#eff6ff' if i == 0 else '#ffffff'
        fg = '#315ce7' if i == 0 else '#475569'
        draw_rounded_rect(d, (30, 125 + i * 42, 210, 158 + i * 42), 6, bg, None)
        d.text((42, 133 + i * 42), it, font=get_font(13, bold=(i==0)), fill=fg)
    
    d.ellipse((40, 465, 48, 473), fill='#10b981')
    d.text((55, 460), "admin@empresa.com", font=get_font(11), fill='#64748b')
    d.text((40, 482), "Cerrar sesion", font=get_font(11, True), fill='#ef4444')
    
    d.text((250, 30), "Panel de analisis y monitoreo", font=get_font(20, True), fill='#0f172a')
    d.text((250, 60), "Monitoreo preventivo de phishing y analisis de riesgo en tiempo real", font=get_font(13), fill='#64748b')
    
    draw_rounded_rect(d, (250, 95, 970, 215), 14, '#1e293b', None)
    d.text((280, 115), "Tu correo, bajo una mirada mas clara.", font=get_font(22, True), fill='#ffffff')
    d.text((280, 150), "Revisa los analisis de correos, consulta senales tecnicas de phishing y gestiona", font=get_font(13), fill='#94a3b8')
    d.text((280, 170), "el aislamiento simulado para proteger a tu organizacion.", font=get_font(13), fill='#94a3b8')
    draw_rounded_rect(d, (800, 135, 940, 175), 8, '#315ce7', None)
    d.text((815, 145), "Revisar correos v", font=get_font(13, True), fill='#ffffff')
    
    cards = [
        ("Correos analizados", "148", "Correos evaluados por el motor", "#3b82f6", 250),
        ("Amenazas detectadas", "23", "Correos clasificados como riesgo alto", "#ef4444", 495),
        ("En cuarentena simulada", "23", "Mensajes aislados preventivamente", "#f59e0b", 740)
    ]
    for title, val, sub, col, x in cards:
        draw_rounded_rect(d, (x, 235, x + 230, 360), 12, '#ffffff', '#e2e8f0', 1)
        d.text((x + 18, 252), title, font=get_font(13, True), fill='#475569')
        d.text((x + 18, 280), val, font=get_font(32, True), fill=col)
        d.text((x + 18, 325), sub, font=get_font(11), fill='#94a3b8')
        
    draw_rounded_rect(d, (250, 385, 970, 500), 12, '#ffffff', '#e2e8f0', 1)
    d.text((275, 405), "[i] Estado de proteccion activo", font=get_font(14, True), fill='#0f172a')
    d.text((275, 430), "• Motor heuristico y reglas de indicadores activas (suplantacion, URLs y urgencia).", font=get_font(12), fill='#475569')
    d.text((275, 452), "• Modo de sensibilidad configurado: Estandar (recomendado para operacion regular).", font=get_font(12), fill='#475569')
    d.text((275, 474), "• Importante: La cuarentena es simulada dentro de MailWatch y no altera tu bandeja real en Gmail.", font=get_font(12), fill='#64748b')
    
    im.save('docs/imagenes/pantalla-03-dashboard-principal.png')

# 4. 04-bandeja-correos.png
def make_workbench():
    w, h = 1000, 530
    im = Image.new('RGB', (w, h), '#ffffff')
    d = ImageDraw.Draw(im)
    
    d.text((30, 20), "Bandeja de Correos y Evaluacion de Riesgo", font=get_font(18, True), fill='#0f172a')
    d.text((30, 48), "Carga lotes de prueba, busca por remitente/asunto y ejecuta analisis de seguridad", font=get_font(13), fill='#64748b')
    
    draw_rounded_rect(d, (30, 85, 230, 125), 8, '#315ce7', None)
    d.text((45, 95), "[^] Cargar dataset prueba", font=get_font(13, True), fill='#ffffff')
    
    draw_rounded_rect(d, (250, 85, 680, 125), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((265, 96), "Buscar por asunto, remitente o ID...", font=get_font(13), fill='#94a3b8')
    
    draw_rounded_rect(d, (700, 85, 960, 125), 8, '#f8fafc', '#cbd5e1', 1)
    d.text((715, 96), "Filtro: Todos los niveles [v]", font=get_font(13), fill='#334155')
    
    draw_rounded_rect(d, (30, 145, 960, 185), 6, '#f1f5f9', None)
    d.text((45, 155), "ID", font=get_font(12, True), fill='#475569')
    d.text((85, 155), "REMITENTE", font=get_font(12, True), fill='#475569')
    d.text((340, 155), "ASUNTO", font=get_font(12, True), fill='#475569')
    d.text((640, 155), "ESTADO / RIESGO", font=get_font(12, True), fill='#475569')
    d.text((810, 155), "ACCION", font=get_font(12, True), fill='#475569')
    
    rows = [
        ("101", "notificaciones@banco-seguro-alerta.com", "URGENTE: Actualiza tu clave en menos de 24 horas", "MALICIOSO (Alto)", "#fef2f2", "#ef4444", "Ver Alerta [!]"),
        ("102", "facturacion@proveedores-eafit.edu.co", "Envio de comprobante de pago orden de compra #502", "SEGURO (Bajo)", "#f0fdf4", "#10b981", "Analizado [ok]"),
        ("103", "soporte-it@promociones-global.net", "Has ganado un bono de combustible corporativo", "SOSPECHOSO (Medio)", "#fffbeb", "#f59e0b", "Ver Motivos [?]"),
        ("104", "contacto@talentohumano.com", "Encuesta de clima laboral 2026", "SEGURO (Bajo)", "#f0fdf4", "#10b981", "Analizado [ok]"),
        ("105", "admin@actualizacion-cuenta-web.org", "Alerta de acceso sospechoso desde IP desconocida", "MALICIOSO (Alto)", "#fef2f2", "#ef4444", "En Cuarentena [x]")
    ]
    
    for i, (rid, rem, asu, rk, rk_bg, rk_fg, btn_txt) in enumerate(rows):
        y = 195 + i * 58
        draw_rounded_rect(d, (30, y, 960, y + 50), 6, '#ffffff', '#e2e8f0', 1)
        d.text((45, y + 15), rid, font=get_font(12, True), fill='#64748b')
        d.text((85, y + 15), rem[:34] + ("..." if len(rem)>34 else ""), font=get_font(12), fill='#1e293b')
        d.text((340, y + 15), asu[:38] + ("..." if len(asu)>38 else ""), font=get_font(12), fill='#1e293b')
        
        draw_rounded_rect(d, (640, y + 10, 785, y + 40), 12, rk_bg, rk_fg, 1)
        d.text((655, y + 16), rk, font=get_font(11, True), fill=rk_fg)
        
        draw_rounded_rect(d, (805, y + 10, 945, y + 40), 6, '#f8fafc', '#cbd5e1', 1)
        d.text((818, y + 16), btn_txt, font=get_font(11, True), fill='#334155')
        
    d.text((45, 490), "Mostrando 1–5 de 148 correos registrados", font=get_font(12), fill='#64748b')
    draw_rounded_rect(d, (830, 480, 960, 515), 6, '#ffffff', '#cbd5e1', 1)
    d.text((850, 488), "<  Pag 1 / 30  >", font=get_font(12, True), fill='#334155')
    
    im.save('docs/imagenes/pantalla-04-bandeja-correos.png')

# 5. 05-analisis-alerta-riesgo.png
def make_alert():
    w, h = 900, 580
    im = Image.new('RGB', (w, h), '#f8fafc')
    d = ImageDraw.Draw(im)
    
    draw_rounded_rect(d, (40, 30, 860, 550), 16, '#ffffff', '#fecaca', 2)
    
    draw_rounded_rect(d, (40, 30, 860, 100), 16, '#fef2f2', None)
    d.text((70, 45), "[!] ALERTA DE SEGURIDAD: CORREO DE RIESGO ALTO", font=get_font(18, True), fill='#dc2626')
    d.text((70, 72), "Clasificacion: MALICIOSO · Deteccion de suplantacion y amenaza de phishing", font=get_font(13), fill='#991b1b')
    
    draw_rounded_rect(d, (70, 120, 830, 190), 8, '#f8fafc', '#e2e8f0', 1)
    d.text((85, 132), "Remitente: notificaciones@banco-seguro-alerta.com", font=get_font(13, True), fill='#1e293b')
    d.text((85, 157), "Asunto: URGENTE: Bloqueo preventivo de cuenta - Actualice credenciales", font=get_font(13), fill='#334155')
    
    d.text((70, 210), "Senales e indicadores tecnicos detectados (en espanol):", font=get_font(14, True), fill='#0f172a')
    
    indicators = [
        ("[!] URL sospechosa / Typosquatting", "El dominio del enlace (banco-seguro-alerta.com) no coincide con el dominio oficial del banco."),
        ("[*] Solicitud de datos sensibles", "El mensaje induce al usuario a ingresar contrasenas o datos bancarios en un portal externo."),
        ("[>] Presion y urgencia injustificada", "Uso de vocabulario intimidatorio de bloqueo inmediato (menos de 24h) para forzar la accion.")
    ]
    
    for i, (title, desc) in enumerate(indicators):
        y = 240 + i * 55
        draw_rounded_rect(d, (70, y, 830, y + 48), 6, '#fff1f2', '#fecdd3', 1)
        d.text((85, y + 8), title, font=get_font(12, True), fill='#9f1239')
        d.text((85, y + 26), desc, font=get_font(11), fill='#4c0519')
        
    draw_rounded_rect(d, (70, 420, 830, 490), 8, '#f0fdf4', '#bbf7d0', 1)
    d.text((85, 432), "[OK] ACCION RECOMENDADA POR EL SISTEMA:", font=get_font(13, True), fill='#15803d')
    d.text((85, 455), "NO abras ningun enlace ni descargues archivos. El correo ha sido trasladado a la cuarentena simulada.", font=get_font(12), fill='#166534')
    
    draw_rounded_rect(d, (330, 505, 570, 540), 8, '#dc2626', None)
    d.text((360, 513), "Entendido · Mantener en cuarentena", font=get_font(12, True), fill='#ffffff')
    
    im.save('docs/imagenes/pantalla-05-analisis-alerta-riesgo.png')

# 6. 06-feedback-clasificacion.png
def make_feedback():
    w, h = 900, 450
    im = Image.new('RGB', (w, h), '#ffffff')
    d = ImageDraw.Draw(im)
    
    draw_rounded_rect(d, (40, 20, 860, 420), 16, '#f8fafc', '#e2e8f0', 2)
    d.text((70, 45), "Retroalimentacion de Clasificacion (US-08)", font=get_font(18, True), fill='#0f172a')
    d.text((70, 75), "Permite al usuario corregir o confirmar la clasificacion del motor para calibrar el modelo.", font=get_font(13), fill='#64748b')
    
    draw_rounded_rect(d, (70, 115, 830, 205), 10, '#ffffff', '#cbd5e1', 1)
    d.text((90, 130), "De: newsletter@comunicaciones-internas.eafit.edu.co", font=get_font(13, True), fill='#1e293b')
    d.text((90, 155), "Asunto: Convocatoria de semilleros de investigacion 2026-2", font=get_font(13), fill='#334155')
    
    draw_rounded_rect(d, (640, 130, 805, 160), 12, '#fffbeb', '#f59e0b', 1)
    d.text((655, 136), "SOSPECHOSO (Medio)", font=get_font(11, True), fill='#b45309')
    d.text((90, 180), "Clasificacion automatica: detecto enlaces salientes fuera del dominio principal.", font=get_font(11), fill='#64748b')
    
    d.text((70, 230), "¿Consideras que la clasificacion fue correcta? Aporta tu valoracion:", font=get_font(14, True), fill='#334155')
    
    draw_rounded_rect(d, (70, 265, 270, 315), 8, '#f0fdf4', '#86efac', 1)
    d.text((95, 278), "[+] Marcar como seguro", font=get_font(13, True), fill='#15803d')
    d.text((95, 298), "(Reportar Falso Positivo)", font=get_font(10), fill='#166534')
    
    draw_rounded_rect(d, (290, 265, 500, 315), 8, '#fef2f2', '#fca5a5', 1)
    d.text((315, 278), "[x] Marcar como peligroso", font=get_font(13, True), fill='#dc2626')
    d.text((315, 298), "(Confirmar como Amenaza)", font=get_font(10), fill='#991b1b')
    
    draw_rounded_rect(d, (70, 340, 830, 395), 8, '#eff6ff', '#bfdbfe', 1)
    d.text((85, 350), "[*] Registro de auditoria:", font=get_font(12, True), fill='#1e40af')
    d.text((85, 370), "Ultima valoracion registrada: Falso positivo por analista@empresa.com el 07/11/2026 en tabla email_feedback.", font=get_font(11), fill='#1e3a8a')
    
    im.save('docs/imagenes/pantalla-06-feedback-clasificacion.png')

def make_cuarentena():
    img = Image.open('docs/imagenes/tutorial-inicio.png')
    cuarentena = img.crop((230, 1100, 1250, 1470))
    cuarentena.save('docs/imagenes/pantalla-07-cuarentena-simulada.png')

def make_sensibilidad():
    img = Image.open('docs/imagenes/tutorial-inicio.png')
    sensibilidad = img.crop((230, 1470, 1250, 1760))
    sensibilidad.save('docs/imagenes/pantalla-08-configuracion-sensibilidad.png')

# 9. 09-metricas-administrador.png
def make_metrics():
    w, h = 950, 480
    im = Image.new('RGB', (w, h), '#f8fafc')
    d = ImageDraw.Draw(im)
    
    draw_rounded_rect(d, (40, 25, 910, 450), 16, '#ffffff', '#e2e8f0', 2)
    d.text((70, 50), "Metricas de Calibracion del Modelo (Vista Administrador)", font=get_font(18, True), fill='#0f172a')
    d.text((70, 80), "Indicadores consolidados calculados a partir de los analisis ejecutados y la retroalimentacion de los usuarios.", font=get_font(13), fill='#64748b')
    
    metrics = [
        ("Precision Global", "94.6 %", "Tasa de acierto general del clasificador", "#10b981", 70),
        ("Correos Evaluados", "148", "Volumen total de muestras analizadas", "#3b82f6", 280),
        ("Falsos Positivos", "3", "Marcados seguros por los usuarios", "#f59e0b", 490),
        ("Falsos Negativos", "1", "Amenazas no detectadas inicialmente", "#ef4444", 700)
    ]
    for lbl, val, desc, col, x in metrics:
        draw_rounded_rect(d, (x, 120, x + 190, 230), 10, '#f8fafc', '#e2e8f0', 1)
        d.text((x + 14, 135), lbl, font=get_font(12, True), fill='#475569')
        d.text((x + 14, 160), val, font=get_font(26, True), fill=col)
        d.text((x + 14, 202), desc, font=get_font(10), fill='#94a3b8')
        
    draw_rounded_rect(d, (70, 255, 880, 420), 10, '#f1f5f9', '#cbd5e1', 1)
    d.text((90, 275), "Interpretacion operativa para la toma de decisiones:", font=get_font(13, True), fill='#1e293b')
    d.text((90, 305), "• Falsos Positivos bajos (3 de 148): Garantiza que correos legitimos no se bloqueen de forma indebida.", font=get_font(12), fill='#334155')
    d.text((90, 332), "• Falsos Negativos minimos (1 caso): El filtro captura el 98%+ de las amenazas bancarias criticas.", font=get_font(12), fill='#334155')
    d.text((90, 359), "• Reentrenamiento y ajuste: La retroalimentacion alimenta la seccion 6 del Caso de Negocio para", font=get_font(12), fill='#334155')
    d.text((90, 381), "  garantizar la viabilidad operativa y la confianza del cliente.", font=get_font(12), fill='#334155')
    
    im.save('docs/imagenes/pantalla-09-metricas-administrador.png')

make_login()
make_register()
make_dashboard()
make_workbench()
make_alert()
make_feedback()
make_cuarentena()
make_sensibilidad()
make_metrics()
print("Updated all 9 screenshots cleanly!")

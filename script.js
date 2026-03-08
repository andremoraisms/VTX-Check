const imageInput = document.getElementById('imageInput');
const btnUpload = document.getElementById('btnUpload');
const imagePreview = document.getElementById('imagePreview');
const placeholderText = document.getElementById('placeholderText');
const btnCapturar = document.getElementById('btnCapturar');
const scriptTemplate = document.getElementById('scriptTemplate');
const resultadoDiv = document.getElementById('resultado');
const statusMsg = document.getElementById('statusMsg');

// 1. ABRIR A GALERIA
btnUpload.addEventListener('click', () => {
    imageInput.click();
});

// 2. MOSTRAR A FOTO NA TELA
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        imagePreview.src = imageUrl;
        
        imagePreview.style.display = 'block';
        placeholderText.style.display = 'none';
        
        statusMsg.style.color = '#1e8e3e';
        statusMsg.innerText = "Foto carregada! Clique no botão vermelho abaixo.";
        btnCapturar.disabled = false; 
        resultadoDiv.style.display = 'none';
    }
});

// 3. EXTRAIR OS DADOS COM FILTRO DE SCANNER (A MÁGICA MELHORADA)
btnCapturar.addEventListener('click', async () => {
    btnCapturar.innerText = "⏳ Tratando e Extraindo dados...";
    btnCapturar.disabled = true;
    btnUpload.disabled = true;
    resultadoDiv.style.display = 'none';

    try {
        // --- INÍCIO DO TRATAMENTO DE IMAGEM ---
        // Cria um canvas (tela de desenho invisível) para aplicar filtros na foto
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Pega o tamanho real da foto que você subiu
        canvas.width = imagePreview.naturalWidth;
        canvas.height = imagePreview.naturalHeight;
        
        // Aplica o filtro de "Xerox": Preto e branco com alto contraste
        ctx.filter = 'grayscale(100%) contrast(200%)';
        ctx.drawImage(imagePreview, 0, 0, canvas.width, canvas.height);
        // --- FIM DO TRATAMENTO DE IMAGEM ---

        // Agora mandamos a imagem filtrada para o Tesseract e mudamos para 'eng' (Inglês)
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        
        console.log("Texto Bruto Lido (para conferência):", text);

        // Filtros de busca (Regex) mais tolerantes a errinhos de leitura
        const modeloMatch = text.match(/(?:Galaxy\s+[A-Za-z0-9\s\-]+)/i);
        const modelo = modeloMatch ? modeloMatch[0].trim() : "[NÃO ENCONTRADO]";

        // Procura por "série", "serie", "sn", ou "serial"
        const snMatch = text.match(/(?:s[ée]rie|serial|sn)[\s\n:]*([A-Za-z0-9]+)/i);
        const sn = snMatch ? snMatch[1] : "[NÃO ENCONTRADO]";

        // Procura pelos 15 dígitos do IMEI
        const imei1Match = text.match(/IMEI\s*1[\s\n:]*(\d{15})/i);
        const imei1 = imei1Match ? imei1Match[1] : "[NÃO ENCONTRADO]";

        const imei2Match = text.match(/IMEI\s*2[\s\n:]*(\d{15})/i);
        const imei2 = imei2Match ? imei2Match[1] : "[NÃO ENCONTRADO]";

        // Substitui as informações no seu script
        let textoPronto = scriptTemplate.value
            .replace('{MODELO DO CELULAR}', modelo)
            .replace('{SERIE}', sn)
            .replace('{IMEI 1}', imei1)
            .replace('{IMEI 2}', imei2);

        // Copia automático
        await navigator.clipboard.writeText(textoPronto);

        resultadoDiv.innerText = "✅ COPIADO COM SUCESSO!\n\n" + textoPronto;
        resultadoDiv.style.display = 'block';
        resultadoDiv.style.backgroundColor = '#d4edda';
        resultadoDiv.style.borderColor = '#c3e6cb';
        statusMsg.innerText = "Finalizado!";

    } catch (error) {
        resultadoDiv.innerText = "❌ Erro ao ler a imagem. Tente uma foto mais nítida e sem reflexos da luz.";
        resultadoDiv.style.display = 'block';
        resultadoDiv.style.backgroundColor = '#f8d7da';
        console.error(error);
    } finally {
        btnCapturar.innerText = "🪄 Extrair e Copiar Texto";
        btnCapturar.disabled = false;
        btnUpload.disabled = false;
    }
});
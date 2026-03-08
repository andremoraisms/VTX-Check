const imageInput = document.getElementById('imageInput');
const btnUpload = document.getElementById('btnUpload');
const imagePreview = document.getElementById('imagePreview');
const placeholderText = document.getElementById('placeholderText');
const btnCapturar = document.getElementById('btnCapturar');
const scriptTemplate = document.getElementById('scriptTemplate');
const resultadoDiv = document.getElementById('resultado');
const statusMsg = document.getElementById('statusMsg');

// 1. ABRIR A GALERIA: Liga o botão visível ao input escondido
btnUpload.addEventListener('click', () => {
    imageInput.click();
});

// 2. MOSTRAR A FOTO NA TELA: Quando a foto é escolhida na galeria
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        imagePreview.src = imageUrl;
        
        imagePreview.style.display = 'block';
        placeholderText.style.display = 'none';
        
        statusMsg.style.color = '#1e8e3e';
        statusMsg.innerText = "Foto carregada! Clique no botão azul abaixo.";
        btnCapturar.disabled = false; // Libera o botão de extrair
        resultadoDiv.style.display = 'none';
    }
});

// 3. EXTRAIR OS DADOS (OCR)
btnCapturar.addEventListener('click', async () => {
    btnCapturar.innerText = "⏳ Extraindo dados... Aguarde!";
    btnCapturar.disabled = true;
    btnUpload.disabled = true;
    resultadoDiv.style.display = 'none';

    try {
        const { data: { text } } = await Tesseract.recognize(imagePreview, 'por');
        
        // Filtros de busca (Regex)
        const modeloMatch = text.match(/(?:Galaxy\s+[A-Za-z0-9\s\-]+)/i);
        const modelo = modeloMatch ? modeloMatch[0].trim() : "[NÃO ENCONTRADO]";

        const snMatch = text.match(/s[ée]rie[\s\n]*([A-Za-z0-9]+)/i);
        const sn = snMatch ? snMatch[1] : "[NÃO ENCONTRADO]";

        const imei1Match = text.match(/IMEI\s*1[\s\n]*(\d{15})/i);
        const imei1 = imei1Match ? imei1Match[1] : "[NÃO ENCONTRADO]";

        const imei2Match = text.match(/IMEI\s*2[\s\n]*(\d{15})/i);
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
        resultadoDiv.innerText = "❌ Erro ao ler a imagem. Tente uma foto mais nítida.";
        resultadoDiv.style.display = 'block';
        resultadoDiv.style.backgroundColor = '#f8d7da';
        console.error(error);
    } finally {
        btnCapturar.innerText = "🪄 Extrair e Copiar Texto";
        btnCapturar.disabled = false;
        btnUpload.disabled = false;
    }
});
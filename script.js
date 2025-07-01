const width = document.getElementById('graph-container').offsetWidth;
const height = window.innerHeight;


//gestore del pulsante torna a grafo iniziale
document.getElementById('btn-reset').addEventListener('click', () => {
  updateGraph(initialGraph);
    // Reset zoom/pan
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    popup.classList.remove('open');
    container.classList.remove('shifted');
  // Chiudi popup se aperto
  popup.classList.remove('open');
  container.classList.remove('shifted');
});


// --- Gestione del popup laterale --- //
const popup = document.getElementById('species-popup');
const popupContent = document.getElementById('species-popup-content');
const popupClose = document.getElementById('species-popup-close');
const container = document.querySelector('.container'); // selezioniamo anche il container

popupClose.addEventListener('click', () => {
    popup.classList.remove('open');
    container.classList.remove('shifted');
});

function openSpeciesPopup(d) {
  popupContent.innerHTML = `
    <div class="species-card">

      ${d.image ? `
        <div class="popup-specimen-box">
          <strong class="popup-nome-scientifico">${d.id}</strong>
          <img src="img/png/${d.image}" alt="${d.id}" class="popup-specimen-image">
          <div class="popup-nome-comune">${d.NomeComune || ''}</div>
        </div>
      ` : ''}
      <table class="species-table">
        ${d.tipo ? `<tr><th>Tipo</th><td>${d.tipo}</td></tr>` : ''}
        ${d.famiglia ? `<tr><th>Famiglia</th><td>${d.famiglia}</td></tr>` : ''}
        ${d.Sottofamiglia ? `<tr><th>Sottofamiglia</th><td>${d.Sottofamiglia}</td></tr>` : ''}
        ${d.Apertura_Alare ? `<tr><th>Apertura alare</th><td>${d.Apertura_Alare}</td></tr>` : ''}
        ${d.osservazioni ? `<tr><th>Osservazioni</th><td>${d.osservazioni}</td></tr>` : ''}
      </table>

      <div class="species-paragraphs">
        ${d.info ? `<p><strong>Info:</strong> ${d.info}</p>` : ''}
        ${d.habitat ? `<p><strong>Habitat:</strong> ${d.habitat}</p>` : ''}
      </div>
    </div>
  `;

  popup.classList.add('open');
  container.classList.add('shifted');
}




//funzione per avviaregrafo principale
function getRootAndSpecies(fullData) {
    // Trova il nodo Lepidotteri
    const lepidotteriNode = fullData.nodes.find(n => n.id === "Lepidotteri");
    if (!lepidotteriNode) return { nodes: [], links: [] };
  
    // Trova tutti i link dove source è "Lepidotteri" (cioè link a specie)
    const specieLinks = fullData.links.filter(l => l.source === "Lepidotteri");
  
    // Ottieni gli id delle specie
    const specieIds = specieLinks.map(l => l.target);
  
    // Trova i nodi specie
    const specieNodes = fullData.nodes.filter(n => specieIds.includes(n.id));
  
    // Costruisci il nuovo array di nodi e link
    const nodes = [lepidotteriNode, ...specieNodes];
    const links = specieLinks;
  
    return { nodes, links };
  }
  


// Creazione del grafo SVG
const svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const g = svg.append("g");  // Gruppo che conterrà nodi e link


let simulation, link, node; // Dichiara anche simulation, link e node qui


function updateGraph(data) {
    // Ora puoi usare svg qui dentro
    // Distruggi il grafo esistente
    g.selectAll("*").remove();

    
    // Creazione della simulazione fisica
    simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(180))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(width / 1.74, height / 1.69))
        .force("collision", d3.forceCollide().radius(d => (d.radius || 40) + 10));

    // Creazione dei collegamenti (links)

    link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter()
        .append("line")
        .attr("class", "link");
    
    node = g.append("g")
        .attr("class", "nodes")
        .selectAll(".node")
        .data(data.nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );
    

    // Aggiunta dei cerchi ai nodi
    node.append("circle")
    .attr("r", d => d.id === "Lepidotteri" ? 18 : 7)
    .style("fill", d => {
      if (d.id === "Lepidotteri") return "#111"; // Nodo radice
      if (d.taxa && d.taxa.includes("Lepidoptera")) return "#888"; // Lepidotteri
      return "#333"; // Predatori/parassitoidi
    });
  
    // Aggiunta di testo ai nodi
    node.append("text")
    .attr("dx", 15)
    .attr("dy", ".50em")
    .text(d => d.label || d.id);
  

    // Gestione del click su un nodo
    node.on("click", function(event, d) {
      if (d.id === "Lepidotteri") {
        popup.classList.remove('open');
        container.classList.remove('shifted');
        updateGraph(fullData);
      } else {
        // Cerca il nodo completo in fullData.nodes
        const nodeData = fullData.nodes.find(n => n.id === d.id);
        if (nodeData) {
          openSpeciesPopup(nodeData);
        } else {
          console.warn("Dati completi non trovati per nodo:", d.id);
          openSpeciesPopup(d); // fallback
        }
    
        if (subGraphs[d.id]) {
          updateGraph(subGraphs[d.id]);
        }
      }
    });
    

      
    // Funzioni per gestire il drag dei nodi
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.8).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Aggiornamento delle posizioni degli elementi
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
}
//gestione del pan e dello zoom
const zoom = d3.zoom()
.scaleExtent([0.1, 4])  // Limiti di zoom (min 0.1x, max 4x)
.on("zoom", (event) => {
    g.attr("transform", event.transform);
});

svg.call(zoom);

const initialGraph = getRootAndSpecies(fullData);
updateGraph(initialGraph);

function addGridClickHandlers() {
  document.querySelectorAll('.specimen-box').forEach(box => {
    box.addEventListener('click', () => {

      // prendi il nome della specie dalla didascalia
      const speciesId = box
        .querySelector('.specimen-info-bottom')
        .textContent.trim();

      // trova i dati completi del nodo
      const nodeData = fullData.nodes.find(n => n.id === speciesId);
      if (!nodeData) return console.warn('Nodo non trovato per:', speciesId);

      // apri il popup con le info
      openSpeciesPopup(nodeData);

      // se esiste un subgrafo per questa specie, mostra quello
      if (subGraphs[speciesId]) {
        updateGraph(subGraphs[speciesId]);
      } else {
        updateGraph(fullData);
      }

    });
  });
}

// chiama la funzione subito
addGridClickHandlers();



// --- Barra di ricerca ---
const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', function() {
  const query = this.value.trim().toLowerCase();

  if (!query) {
    // Se il campo è vuoto, mostra il grafo completo o la vista iniziale
    updateGraph(fullData); // oppure updateGraph(getRootAndSpecies(fullData));
    return;
  }

  // Filtra i nodi in base alla query (id, label, taxa)
  const filteredNodes = fullData.nodes.filter(node =>
    node.id.toLowerCase().includes(query) ||
    (node.label && node.label.toLowerCase().includes(query)) ||
    (node.taxa && node.taxa.some(t => t.toLowerCase().includes(query)))
  );

  const filteredIds = new Set(filteredNodes.map(n => n.id));

  // Filtra i link che collegano solo nodi filtrati
  const filteredLinks = fullData.links.filter(link =>
    filteredIds.has(link.source) && filteredIds.has(link.target)
  );


  // Aggiorna il grafo con i dati filtrati
  updateGraph({ nodes: filteredNodes, links: filteredLinks });
});

